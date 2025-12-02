# Migration of AWS to OpenStack

This directory contains tools and scripts for migrating AWS resources to OpenStack.

## Available Migrations

### Compute (EC2 Instances)

The compute migration script (`compute/migrate_ec2_to_openstack.py`) migrates EC2 instances to OpenStack by:

- Discovering EC2 instance details (instance type, volumes, security groups, etc.)
- Creating AMI snapshots of EC2 instances
- Importing images into OpenStack Glance
- Creating matching OpenStack instances
- Transferring data from EC2 to OpenStack instances

See [compute/README.md](./compute/README.md) for detailed usage instructions.

## Quick Start

1. Navigate to the specific migration type directory (e.g., `compute/`)
2. Install dependencies: `pip install -r requirements.txt`
3. Follow the README instructions for that migration type
