# AWS EC2 to OpenStack Migration Script

This script migrates an EC2 instance to OpenStack by discovering instance details, optionally creating an AMI snapshot, importing it into OpenStack, creating a matching instance, and transferring data.

## Features

- **EC2 Instance Discovery**: Automatically discovers EC2 instance details including instance type, volumes, security groups, and tags
- **AMI Creation**: Optionally creates an AMI snapshot of the EC2 instance
- **Image Import**: Supports importing images into OpenStack Glance (from local files or S3)
- **Instance Creation**: Creates a matching OpenStack instance with similar specifications
- **Data Transfer**: Transfers data from EC2 to OpenStack using rsync or SCP
- **Metadata Export**: Saves migration metadata for reference

## Prerequisites

### AWS Setup

1. **AWS Credentials**: Configure AWS credentials using one of:
   - AWS CLI: `aws configure`
   - Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - IAM role (if running on EC2)
   - AWS profile: `--aws-profile <profile-name>`

2. **IAM Permissions**: Your AWS user/role needs:
   - `ec2:DescribeInstances`
   - `ec2:DescribeVolumes`
   - `ec2:DescribeImages`
   - `ec2:CreateImage` (if using `--create-ami`)
   - `ec2:ExportImage` (if using `--export-to-s3`)
   - `s3:PutObject` (if using `--export-to-s3`)

### OpenStack Setup

1. **OpenStack Credentials**: Configure using one of:
   - `clouds.yaml` file (recommended): Place in `~/.config/openstack/clouds.yaml`
   - Environment variables: `OS_*` variables
   - Command line arguments

2. **Required OpenStack Resources**:
   - A network (default: `private`)
   - A flavor matching your EC2 instance type (or use the auto-mapping)
   - A keypair (if using SSH key authentication)
   - Glance image service access (for image imports)

### System Requirements

- Python 3.8+
- SSH access to both EC2 and OpenStack instances
- `rsync` installed (for data transfer)
- Network connectivity to both AWS and OpenStack

## Installation

1. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Make the script executable**:
   ```bash
   chmod +x migrate_ec2_to_openstack.py
   ```

## Usage

### Basic Migration (Discovery Only)

Discover EC2 instance details without making changes:

```bash
python migrate_ec2_to_openstack.py \
  --aws-instance-id i-1234567890abcdef0 \
  --aws-region us-east-1 \
  --dry-run
```

### Full Migration with AMI Creation

Create an AMI, import to OpenStack, and create instance:

```bash
python migrate_ec2_to_openstack.py \
  --aws-instance-id i-1234567890abcdef0 \
  --aws-region us-east-1 \
  --create-ami \
  --ami-name my-migration-ami \
  --openstack-cloud mycloud \
  --openstack-instance-name migrated-server \
  --openstack-network private \
  --openstack-keypair my-keypair
```

### Migration with Image Import

If you already have an image file (e.g., downloaded from AWS or exported):

```bash
python migrate_ec2_to_openstack.py \
  --aws-instance-id i-1234567890abcdef0 \
  --aws-region us-east-1 \
  --import-image-file /path/to/image.raw \
  --openstack-cloud mycloud \
  --openstack-image-name imported-image \
  --openstack-instance-name migrated-server
```

### Migration with Data Transfer

Transfer data from EC2 to OpenStack instance:

```bash
python migrate_ec2_to_openstack.py \
  --aws-instance-id i-1234567890abcdef0 \
  --aws-region us-east-1 \
  --create-ami \
  --openstack-cloud mycloud \
  --transfer-data \
  --source-key ~/.ssh/aws-key.pem \
  --dest-key ~/.ssh/openstack-key.pem \
  --source-user ubuntu \
  --dest-user ubuntu \
  --source-path /home/ubuntu/data \
  --dest-path /home/ubuntu/data \
  --exclude "*.log" \
  --exclude "*.tmp"
```

### Export AMI to S3 for OpenStack Import

Export AMI to S3, then manually import to OpenStack:

```bash
python migrate_ec2_to_openstack.py \
  --aws-instance-id i-1234567890abcdef0 \
  --aws-region us-east-1 \
  --create-ami \
  --export-to-s3 \
  --s3-bucket my-migration-bucket
```

## Command Line Options

### AWS Options

- `--aws-instance-id`: EC2 instance ID to migrate (required)
- `--aws-region`: AWS region (default: us-east-1)
- `--aws-profile`: AWS profile name (optional)

### Image Migration Options

- `--create-ami`: Create an AMI snapshot of the EC2 instance
- `--ami-name`: Name for the created AMI (default: auto-generated)
- `--export-to-s3`: Export AMI to S3 for import to OpenStack
- `--s3-bucket`: S3 bucket for AMI export
- `--import-image-file`: Local image file to import into OpenStack

### OpenStack Options

- `--openstack-cloud`: OpenStack cloud name from clouds.yaml
- `--openstack-image-name`: Name for the OpenStack image
- `--openstack-flavor`: OpenStack flavor name (default: mapped from EC2 instance type)
- `--openstack-network`: OpenStack network name (default: private)
- `--openstack-keypair`: OpenStack keypair name (default: same as EC2 keypair)
- `--openstack-instance-name`: Name for the OpenStack instance

### Data Transfer Options

- `--transfer-data`: Transfer data from EC2 instance to OpenStack instance
- `--source-path`: Source path on EC2 instance (default: /)
- `--dest-path`: Destination path on OpenStack instance (default: /)
- `--source-key`: SSH private key file for EC2 instance
- `--dest-key`: SSH private key file for OpenStack instance
- `--source-user`: SSH user for EC2 instance (default: ubuntu)
- `--dest-user`: SSH user for OpenStack instance (default: ubuntu)
- `--exclude`: Patterns to exclude from transfer (can be specified multiple times)

### General Options

- `--output-dir`: Directory to save migration metadata
- `--verbose`: Enable verbose logging
- `--dry-run`: Perform a dry run without making changes

## Instance Type Mapping

The script automatically maps AWS instance types to OpenStack flavors. Default mappings:

| AWS Instance Type | OpenStack Flavor |
|------------------|------------------|
| t2.micro, t3.micro | m1.tiny |
| t2.small, t3.small | m1.small |
| t2.medium, t3.medium | m1.medium |
| t2.large, t3.large | m1.large |
| m5.large | m1.large |
| m5.xlarge | m1.xlarge |

You can override this with `--openstack-flavor`.

## Image Import Methods

### Method 1: Direct AMI Export/Import (Limited Support)

Some OpenStack deployments support direct import from AWS S3, but this is not universally available. The script attempts this but may fall back to manual steps.

### Method 2: Local Image File Import (Recommended)

1. Export AMI from AWS to a local file (using AWS CLI or other tools)
2. Use `--import-image-file` to upload to OpenStack Glance

### Method 3: Manual Image Import

1. Create AMI: `--create-ami`
2. Export to S3: `--export-to-s3 --s3-bucket <bucket>`
3. Download from S3 to local machine
4. Upload to OpenStack Glance manually or using `--import-image-file`

## Data Transfer

The script supports two methods for data transfer:

1. **rsync** (default): More efficient for large transfers, supports resuming
2. **SCP**: Simpler but less efficient for large datasets

Data transfer requires:
- SSH access to both instances
- Appropriate SSH keys
- Network connectivity between instances

## Migration Metadata

The script saves migration metadata to `migration_metadata.json` in the output directory, including:

- EC2 instance details
- OpenStack instance details
- Migration timestamp
- AMI/image information

## Troubleshooting

### AWS Connection Issues

- Verify AWS credentials: `aws sts get-caller-identity`
- Check IAM permissions
- Verify region is correct

### OpenStack Connection Issues

- Verify `clouds.yaml` is in `~/.config/openstack/clouds.yaml`
- Test connection: `openstack server list`
- Check environment variables if not using clouds.yaml

### Image Import Issues

- Ensure image format is supported (RAW, QCOW2, VMDK, etc.)
- Check Glance service is accessible
- Verify sufficient disk space in Glance

### Data Transfer Issues

- Verify SSH keys have correct permissions: `chmod 600 <key-file>`
- Test SSH connectivity manually
- Check firewall/security group rules allow SSH
- Ensure rsync is installed on both systems

### Instance Creation Issues

- Verify network exists: `openstack network list`
- Check flavor availability: `openstack flavor list`
- Verify keypair exists: `openstack keypair list`
- Check quota limits: `openstack quota show`

## Limitations

1. **Image Format Compatibility**: Not all AWS AMI formats are directly compatible with OpenStack. RAW format is most compatible.

2. **Instance Type Mapping**: Automatic mapping may not be perfect. Review and adjust flavors as needed.

3. **Security Groups**: Security group rules are not automatically migrated. You'll need to recreate them manually in OpenStack.

4. **Network Configuration**: Network topology differences between AWS and OpenStack may require manual adjustment.

5. **Boot Volume**: The script attempts to match volume sizes, but boot volume configuration may differ.

6. **VM Import/Export**: Direct S3 export/import may not be available in all regions or accounts.

## Example Workflow

1. **Discovery Phase**:
   ```bash
   python migrate_ec2_to_openstack.py \
     --aws-instance-id i-1234567890abcdef0 \
     --dry-run
   ```

2. **Create AMI**:
   ```bash
   python migrate_ec2_to_openstack.py \
     --aws-instance-id i-1234567890abcdef0 \
     --create-ami \
     --ami-name production-backup-20240101
   ```

3. **Export and Download** (if direct import not available):
   ```bash
   python migrate_ec2_to_openstack.py \
     --aws-instance-id i-1234567890abcdef0 \
     --create-ami \
     --export-to-s3 \
     --s3-bucket my-bucket
   # Then download from S3 manually
   ```

4. **Import and Create Instance**:
   ```bash
   python migrate_ec2_to_openstack.py \
     --aws-instance-id i-1234567890abcdef0 \
     --import-image-file ./downloaded-image.raw \
     --openstack-cloud production \
     --openstack-instance-name migrated-production
   ```

5. **Transfer Data**:
   ```bash
   python migrate_ec2_to_openstack.py \
     --aws-instance-id i-1234567890abcdef0 \
     --transfer-data \
     --source-key ~/.ssh/aws-key.pem \
     --dest-key ~/.ssh/openstack-key.pem \
     --source-path /var/www \
     --dest-path /var/www
   ```

## Security Considerations

- SSH keys should have restricted permissions (`chmod 600`)
- Use IAM roles when possible instead of access keys
- Review security group rules before opening ports
- Consider encrypting data in transit during transfer
- Verify OpenStack instance security groups after creation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review migration metadata JSON for details
3. Enable verbose logging: `--verbose`
4. Check AWS and OpenStack logs

## License

See the main project LICENSE file.

