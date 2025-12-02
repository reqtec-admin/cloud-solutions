#!/usr/bin/env python3
"""
AWS EC2 to OpenStack Migration Script

This script migrates an EC2 instance to OpenStack by:
1. Discovering EC2 instance details (instance type, volumes, security groups, etc.)
2. Optionally creating an AMI snapshot of the EC2 instance
3. Exporting/importing the image to OpenStack (if supported)
4. Creating a matching OpenStack instance
5. Transferring data from the EC2 instance to the OpenStack instance

Requirements:
- AWS credentials configured (via AWS CLI, environment variables, or IAM role)
- OpenStack credentials configured (via clouds.yaml or environment variables)
- boto3, openstacksdk, paramiko, and other dependencies installed
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import boto3
    from botocore.exceptions import ClientError, BotoCoreError
except ImportError:
    print("ERROR: boto3 is required. Install with: pip install boto3")
    sys.exit(1)

try:
    import openstack
    from openstack import exceptions as os_exceptions
except ImportError:
    print("ERROR: openstacksdk is required. Install with: pip install openstacksdk")
    sys.exit(1)

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko is required. Install with: pip install paramiko")
    sys.exit(1)

LOG = logging.getLogger("ec2_to_openstack_migration")


class EC2InstanceInfo:
    """Container for EC2 instance information."""

    def __init__(self, instance_data: Dict[str, Any]):
        self.instance_id = instance_data["InstanceId"]
        self.instance_type = instance_data["InstanceType"]
        self.image_id = instance_data["ImageId"]
        self.key_name = instance_data.get("KeyName")
        self.private_ip = instance_data.get("PrivateIpAddress")
        self.public_ip = instance_data.get("PublicIpAddress")
        self.state = instance_data["State"]["Name"]
        self.architecture = instance_data.get("Architecture", "x86_64")
        self.platform = instance_data.get("Platform", "linux")
        self.volumes = []
        self.security_groups = [
            sg["GroupId"] for sg in instance_data.get("SecurityGroups", [])
        ]
        self.tags = {tag["Key"]: tag["Value"] for tag in instance_data.get("Tags", [])}
        self.name = self.tags.get("Name", self.instance_id)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "instance_id": self.instance_id,
            "instance_type": self.instance_type,
            "image_id": self.image_id,
            "key_name": self.key_name,
            "private_ip": self.private_ip,
            "public_ip": self.public_ip,
            "state": self.state,
            "architecture": self.architecture,
            "platform": self.platform,
            "volumes": self.volumes,
            "security_groups": self.security_groups,
            "tags": self.tags,
            "name": self.name,
        }


class EC2Migrator:
    """Handles AWS EC2 operations for migration."""

    def __init__(self, region: str = "us-east-1", profile: Optional[str] = None):
        """Initialize AWS clients."""
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        self.ec2 = session.client("ec2", region_name=region)
        self.region = region
        LOG.info(f"Initialized AWS client for region: {region}")

    def get_instance(self, instance_id: str) -> EC2InstanceInfo:
        """Get EC2 instance details."""
        try:
            response = self.ec2.describe_instances(InstanceIds=[instance_id])
            if not response["Reservations"]:
                raise ValueError(f"Instance {instance_id} not found")

            instance_data = response["Reservations"][0]["Instances"][0]
            instance_info = EC2InstanceInfo(instance_data)

            # Get volume information
            volume_ids = [
                bdm["Ebs"]["VolumeId"]
                for bdm in instance_data.get("BlockDeviceMappings", [])
                if "Ebs" in bdm
            ]

            if volume_ids:
                volumes_response = self.ec2.describe_volumes(VolumeIds=volume_ids)
                instance_info.volumes = [
                    {
                        "volume_id": vol["VolumeId"],
                        "size": vol["Size"],
                        "device": next(
                            (
                                bdm["DeviceName"]
                                for bdm in instance_data.get("BlockDeviceMappings", [])
                                if bdm.get("Ebs", {}).get("VolumeId") == vol["VolumeId"]
                            ),
                            None,
                        ),
                        "volume_type": vol["VolumeType"],
                        "encrypted": vol.get("Encrypted", False),
                    }
                    for vol in volumes_response["Volumes"]
                ]

            return instance_info
        except ClientError as e:
            LOG.error(f"Failed to get instance {instance_id}: {e}")
            raise

    def create_ami(
        self, instance_id: str, name: str, description: Optional[str] = None
    ) -> str:
        """Create an AMI from the EC2 instance."""
        if not description:
            description = f"Migration AMI for {instance_id} created on {datetime.now().isoformat()}"

        try:
            LOG.info(f"Creating AMI from instance {instance_id}...")
            response = self.ec2.create_image(
                InstanceId=instance_id,
                Name=name,
                Description=description,
                NoReboot=True,  # Don't reboot the instance
            )
            ami_id = response["ImageId"]
            LOG.info(f"AMI creation initiated: {ami_id}")

            # Wait for AMI to be available
            LOG.info("Waiting for AMI to become available (this may take several minutes)...")
            waiter = self.ec2.get_waiter("image_available")
            waiter.wait(ImageIds=[ami_id], WaiterConfig={"Delay": 30, "MaxAttempts": 60})

            LOG.info(f"AMI {ami_id} is now available")
            return ami_id
        except ClientError as e:
            LOG.error(f"Failed to create AMI: {e}")
            raise

    def export_ami_to_s3(
        self, ami_id: str, s3_bucket: str, s3_prefix: str = "ami-exports"
    ) -> Dict[str, Any]:
        """
        Export AMI to S3 as a disk image.
        Note: This requires VM Import/Export service and may take significant time.
        """
        try:
            LOG.info(f"Exporting AMI {ami_id} to S3 bucket {s3_bucket}...")
            # Note: VM Import/Export requires special permissions and setup
            # This is a placeholder - actual implementation may vary
            response = self.ec2.export_image(
                ImageId=ami_id,
                DiskImageFormat="RAW",
                S3ExportLocation={
                    "S3Bucket": s3_bucket,
                    "S3Prefix": s3_prefix,
                },
            )
            export_task_id = response["ExportImageTaskId"]
            LOG.info(f"Export task started: {export_task_id}")

            # Wait for export to complete
            while True:
                task = self.ec2.describe_export_image_tasks(
                    ExportImageTaskIds=[export_task_id]
                )["ExportImageTasks"][0]
                status = task["Status"]
                if status == "completed":
                    LOG.info("AMI export completed successfully")
                    return {
                        "task_id": export_task_id,
                        "s3_location": task["S3ExportLocation"],
                        "status": status,
                    }
                elif status == "deleting" or status == "deleted":
                    raise RuntimeError(f"Export failed with status: {status}")
                LOG.info(f"Export status: {status}, waiting...")
                time.sleep(30)
        except ClientError as e:
            if e.response["Error"]["Code"] == "InvalidParameter":
                LOG.warning(
                    "AMI export may not be available in this region or account. "
                    "Skipping export step."
                )
                return None
            LOG.error(f"Failed to export AMI: {e}")
            raise


class OpenStackMigrator:
    """Handles OpenStack operations for migration."""

    def __init__(self, cloud_name: Optional[str] = None):
        """Initialize OpenStack connection."""
        try:
            self.conn = openstack.connect(cloud=cloud_name) if cloud_name else openstack.connect()
            LOG.info("Connected to OpenStack")
        except Exception as e:
            LOG.error(f"Failed to connect to OpenStack: {e}")
            raise

    def map_instance_type(self, aws_instance_type: str) -> str:
        """Map AWS instance type to OpenStack flavor."""
        # Basic mapping - adjust based on your OpenStack flavors
        mapping = {
            "t2.micro": "m1.tiny",
            "t2.small": "m1.small",
            "t2.medium": "m1.medium",
            "t2.large": "m1.large",
            "t2.xlarge": "m1.xlarge",
            "t3.micro": "m1.tiny",
            "t3.small": "m1.small",
            "t3.medium": "m1.medium",
            "t3.large": "m1.large",
            "m5.large": "m1.large",
            "m5.xlarge": "m1.xlarge",
            "m5.2xlarge": "m1.2xlarge",
        }
        return mapping.get(aws_instance_type, "m1.medium")

    def import_image_from_s3(
        self,
        image_name: str,
        s3_url: str,
        disk_format: str = "raw",
        container_format: str = "bare",
    ) -> Optional[str]:
        """
        Import image from S3 into OpenStack Glance.
        Note: This requires OpenStack to have access to S3 or the image to be downloaded locally first.
        """
        try:
            LOG.info(f"Importing image {image_name} from S3...")
            # OpenStack Glance can import from various sources
            # This is a simplified version - actual implementation depends on your setup
            image = self.conn.image.create_image(
                name=image_name,
                disk_format=disk_format,
                container_format=container_format,
                visibility="private",
            )
            # Note: Actual import from S3 may require additional steps
            # such as downloading to local machine first, then uploading to Glance
            LOG.warning(
                "Direct S3 import may not be supported. "
                "Consider downloading the image locally first, then uploading to Glance."
            )
            return image.id
        except Exception as e:
            LOG.error(f"Failed to import image: {e}")
            return None

    def upload_image_file(
        self, image_name: str, file_path: str, disk_format: str = "raw"
    ) -> Optional[str]:
        """Upload a local image file to OpenStack Glance."""
        try:
            LOG.info(f"Uploading image {image_name} from {file_path}...")
            image = self.conn.image.create_image(
                name=image_name,
                filename=file_path,
                disk_format=disk_format,
                container_format="bare",
                visibility="private",
            )
            LOG.info(f"Image upload initiated: {image.id}")
            # Wait for image to be active
            self.conn.image.wait_for_image(image, status="active", wait=3600)
            LOG.info(f"Image {image.id} is now active")
            return image.id
        except Exception as e:
            LOG.error(f"Failed to upload image: {e}")
            return None

    def create_instance(
        self,
        name: str,
        image_id: str,
        flavor_name: str,
        key_name: Optional[str],
        network_name: str = "private",
        security_groups: Optional[List[str]] = None,
        volume_size: Optional[int] = None,
        user_data: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create an OpenStack instance."""
        try:
            LOG.info(f"Creating OpenStack instance {name}...")

            # Find network
            network = self.conn.network.find_network(network_name)
            if not network:
                raise ValueError(f"Network {network_name} not found")

            # Find flavor
            flavor = self.conn.compute.find_flavor(flavor_name)
            if not flavor:
                raise ValueError(f"Flavor {flavor_name} not found")

            # Prepare security groups
            sec_groups = security_groups or ["default"]

            server_kwargs = {
                "name": name,
                "image": image_id,
                "flavor": flavor.id,
                "network": network.id,
                "security_groups": sec_groups,
            }

            if key_name:
                keypair = self.conn.compute.find_keypair(key_name)
                if keypair:
                    server_kwargs["key_name"] = key_name
                else:
                    LOG.warning(f"Keypair {key_name} not found, proceeding without it")

            if volume_size:
                server_kwargs["boot_from_volume"] = True
                server_kwargs["volume_size"] = volume_size

            if user_data:
                server_kwargs["user_data"] = user_data

            server = self.conn.compute.create_server(**server_kwargs)
            LOG.info(f"Server creation initiated: {server.id}")

            # Wait for server to be active
            server = self.conn.compute.wait_for_server(server, status="ACTIVE", wait=600)
            LOG.info(f"Server {server.id} is now active")

            # Get floating IP if available
            floating_ip = None
            try:
                fip = self.conn.network.create_ip(floating_network_id="public")
                self.conn.compute.add_floating_ip_to_server(server, fip.floating_ip_address)
                floating_ip = fip.floating_ip_address
                LOG.info(f"Assigned floating IP: {floating_ip}")
            except Exception as e:
                LOG.warning(f"Could not assign floating IP: {e}")

            return {
                "server_id": server.id,
                "name": server.name,
                "status": server.status,
                "floating_ip": floating_ip,
                "private_ip": server.addresses.get(network_name, [{}])[0].get("addr")
                if server.addresses
                else None,
            }
        except Exception as e:
            LOG.error(f"Failed to create instance: {e}")
            raise

    def get_instance_ip(self, server_id: str) -> Optional[str]:
        """Get the IP address of an OpenStack instance."""
        try:
            server = self.conn.compute.get_server(server_id)
            # Try to get floating IP first, then private IP
            for network_name, addresses in server.addresses.items():
                for addr in addresses:
                    if addr.get("OS-EXT-IPS:type") == "floating":
                        return addr.get("addr")
            # Fallback to private IP
            for network_name, addresses in server.addresses.items():
                for addr in addresses:
                    return addr.get("addr")
            return None
        except Exception as e:
            LOG.error(f"Failed to get instance IP: {e}")
            return None


class DataTransfer:
    """Handles data transfer between EC2 and OpenStack instances."""

    @staticmethod
    def transfer_with_rsync(
        source_host: str,
        source_user: str,
        source_key: str,
        source_path: str,
        dest_host: str,
        dest_user: str,
        dest_key: str,
        dest_path: str,
        exclude_patterns: Optional[List[str]] = None,
    ) -> bool:
        """Transfer data using rsync over SSH."""
        try:
            exclude_args = []
            if exclude_patterns:
                for pattern in exclude_patterns:
                    exclude_args.extend(["--exclude", pattern])

            # Use rsync with SSH
            cmd = [
                "rsync",
                "-avz",
                "--progress",
                "-e",
                f'ssh -i {source_key} -o StrictHostKeyChecking=no',
            ] + exclude_args + [
                f"{source_user}@{source_host}:{source_path}/",
                f"{dest_user}@{dest_host}:{dest_path}/",
            ]

            LOG.info(f"Starting rsync transfer from {source_host} to {dest_host}...")
            LOG.info(f"Command: {' '.join(cmd)}")

            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
            )

            # Stream output
            for line in process.stdout:
                LOG.info(f"rsync: {line.strip()}")

            process.wait()
            if process.returncode != 0:
                error = process.stderr.read()
                LOG.error(f"rsync failed: {error}")
                return False

            LOG.info("rsync transfer completed successfully")
            return True
        except Exception as e:
            LOG.error(f"Failed to transfer data with rsync: {e}")
            return False

    @staticmethod
    def transfer_with_scp(
        source_host: str,
        source_user: str,
        source_key: str,
        source_path: str,
        dest_host: str,
        dest_user: str,
        dest_key: str,
        dest_path: str,
    ) -> bool:
        """Transfer data using SCP."""
        try:
            cmd = [
                "scp",
                "-i",
                source_key,
                "-o",
                "StrictHostKeyChecking=no",
                "-r",
                f"{source_user}@{source_host}:{source_path}",
                f"{dest_user}@{dest_host}:{dest_path}",
            ]

            LOG.info(f"Starting SCP transfer from {source_host} to {dest_host}...")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                LOG.error(f"SCP failed: {result.stderr}")
                return False

            LOG.info("SCP transfer completed successfully")
            return True
        except Exception as e:
            LOG.error(f"Failed to transfer data with SCP: {e}")
            return False


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Migrate an EC2 instance to OpenStack",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # AWS configuration
    parser.add_argument(
        "--aws-instance-id",
        required=True,
        help="EC2 instance ID to migrate",
    )
    parser.add_argument(
        "--aws-region",
        default="us-east-1",
        help="AWS region (default: us-east-1)",
    )
    parser.add_argument(
        "--aws-profile",
        help="AWS profile name (optional)",
    )

    # Image migration options
    parser.add_argument(
        "--create-ami",
        action="store_true",
        help="Create an AMI snapshot of the EC2 instance",
    )
    parser.add_argument(
        "--ami-name",
        help="Name for the created AMI (default: auto-generated)",
    )
    parser.add_argument(
        "--export-to-s3",
        action="store_true",
        help="Export AMI to S3 for import to OpenStack",
    )
    parser.add_argument(
        "--s3-bucket",
        help="S3 bucket for AMI export",
    )
    parser.add_argument(
        "--import-image-file",
        help="Local image file to import into OpenStack (instead of creating from EC2)",
    )

    # OpenStack configuration
    parser.add_argument(
        "--openstack-cloud",
        help="OpenStack cloud name from clouds.yaml (optional)",
    )
    parser.add_argument(
        "--openstack-image-name",
        help="Name for the OpenStack image (default: from EC2 instance name)",
    )
    parser.add_argument(
        "--openstack-flavor",
        help="OpenStack flavor name (default: mapped from EC2 instance type)",
    )
    parser.add_argument(
        "--openstack-network",
        default="private",
        help="OpenStack network name (default: private)",
    )
    parser.add_argument(
        "--openstack-keypair",
        help="OpenStack keypair name (default: same as EC2 keypair)",
    )
    parser.add_argument(
        "--openstack-instance-name",
        help="Name for the OpenStack instance (default: from EC2 instance name)",
    )

    # Data transfer options
    parser.add_argument(
        "--transfer-data",
        action="store_true",
        help="Transfer data from EC2 instance to OpenStack instance",
    )
    parser.add_argument(
        "--source-path",
        default="/",
        help="Source path on EC2 instance (default: /)",
    )
    parser.add_argument(
        "--dest-path",
        default="/",
        help="Destination path on OpenStack instance (default: /)",
    )
    parser.add_argument(
        "--source-key",
        help="SSH private key file for EC2 instance",
    )
    parser.add_argument(
        "--dest-key",
        help="SSH private key file for OpenStack instance",
    )
    parser.add_argument(
        "--source-user",
        default="ubuntu",
        help="SSH user for EC2 instance (default: ubuntu)",
    )
    parser.add_argument(
        "--dest-user",
        default="ubuntu",
        help="SSH user for OpenStack instance (default: ubuntu)",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        help="Patterns to exclude from transfer (can be specified multiple times)",
    )

    # General options
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory to save migration metadata (default: ./migration-<timestamp>)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run without making changes",
    )

    return parser.parse_args()


def save_migration_metadata(
    output_dir: Path, ec2_info: EC2InstanceInfo, openstack_info: Optional[Dict[str, Any]]
) -> None:
    """Save migration metadata to JSON file."""
    metadata = {
        "migration_timestamp": datetime.now().isoformat(),
        "ec2_instance": ec2_info.to_dict(),
        "openstack_instance": openstack_info,
    }

    metadata_file = output_dir / "migration_metadata.json"
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)

    LOG.info(f"Migration metadata saved to {metadata_file}")


def main() -> None:
    """Main migration function."""
    args = parse_args()

    # Setup logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Setup output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_dir = Path(f"./migration-{timestamp}")
    output_dir.mkdir(parents=True, exist_ok=True)

    LOG.info(f"Starting migration of EC2 instance {args.aws_instance_id}")
    LOG.info(f"Output directory: {output_dir}")

    if args.dry_run:
        LOG.warning("DRY RUN MODE - No changes will be made")

    try:
        # Initialize AWS client
        aws_migrator = EC2Migrator(region=args.aws_region, profile=args.aws_profile)

        # Get EC2 instance information
        LOG.info(f"Fetching EC2 instance details for {args.aws_instance_id}...")
        ec2_info = aws_migrator.get_instance(args.aws_instance_id)
        LOG.info(f"Found instance: {ec2_info.name} ({ec2_info.instance_type})")

        # Create AMI if requested
        ami_id = None
        if args.create_ami and not args.dry_run:
            ami_name = args.ami_name or f"{ec2_info.name}-migration-{datetime.now().strftime('%Y%m%d')}"
            ami_id = aws_migrator.create_ami(
                args.aws_instance_id, ami_name, f"Migration AMI for {ec2_info.instance_id}"
            )
            LOG.info(f"Created AMI: {ami_id}")

        # Export to S3 if requested
        export_info = None
        if args.export_to_s3 and ami_id and args.s3_bucket and not args.dry_run:
            export_info = aws_migrator.export_ami_to_s3(
                ami_id, args.s3_bucket, "ami-exports"
            )
            if export_info:
                LOG.info(f"Exported AMI to S3: {export_info['s3_location']}")

        # Initialize OpenStack client
        openstack_migrator = OpenStackMigrator(cloud_name=args.openstack_cloud)

        # Import image if provided
        openstack_image_id = None
        if args.import_image_file and not args.dry_run:
            image_name = args.openstack_image_name or f"{ec2_info.name}-imported"
            openstack_image_id = openstack_migrator.upload_image_file(
                image_name, args.import_image_file
            )
            if openstack_image_id:
                LOG.info(f"Imported image to OpenStack: {openstack_image_id}")

        # Create OpenStack instance
        openstack_info = None
        if openstack_image_id and not args.dry_run:
            instance_name = args.openstack_instance_name or ec2_info.name
            flavor_name = args.openstack_flavor or openstack_migrator.map_instance_type(
                ec2_info.instance_type
            )
            keypair_name = args.openstack_keypair or ec2_info.key_name

            openstack_info = openstack_migrator.create_instance(
                name=instance_name,
                image_id=openstack_image_id,
                flavor_name=flavor_name,
                key_name=keypair_name,
                network_name=args.openstack_network,
                volume_size=sum(vol["size"] for vol in ec2_info.volumes) if ec2_info.volumes else None,
            )
            LOG.info(f"Created OpenStack instance: {openstack_info['server_id']}")

        # Transfer data if requested
        if args.transfer_data and ec2_info.public_ip and openstack_info and not args.dry_run:
            dest_ip = openstack_info.get("floating_ip") or openstack_info.get("private_ip")
            if not dest_ip:
                LOG.warning("Could not determine OpenStack instance IP, skipping data transfer")
            elif not args.source_key or not args.dest_key:
                LOG.warning("SSH keys not provided, skipping data transfer")
            else:
                LOG.info("Starting data transfer...")
                success = DataTransfer.transfer_with_rsync(
                    source_host=ec2_info.public_ip,
                    source_user=args.source_user,
                    source_key=args.source_key,
                    source_path=args.source_path,
                    dest_host=dest_ip,
                    dest_user=args.dest_user,
                    dest_key=args.dest_key,
                    dest_path=args.dest_path,
                    exclude_patterns=args.exclude,
                )
                if success:
                    LOG.info("Data transfer completed successfully")
                else:
                    LOG.error("Data transfer failed")

        # Save migration metadata
        save_migration_metadata(output_dir, ec2_info, openstack_info)

        LOG.info("Migration process completed")
        if openstack_info:
            LOG.info(f"OpenStack instance accessible at: {openstack_info.get('floating_ip') or openstack_info.get('private_ip')}")

    except Exception as e:
        LOG.error(f"Migration failed: {e}", exc_info=args.verbose)
        sys.exit(1)


if __name__ == "__main__":
    main()

