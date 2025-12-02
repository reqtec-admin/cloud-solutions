# DevStack on Ubuntu 24.04 (Noble)

This directory contains a Vagrant setup for running OpenStack DevStack 2025.2 on Ubuntu 24.04 (Noble Numbat).

## Prerequisites

1. **Add the Ubuntu 24.04 Vagrant box** (required before first use):
   ```bash
   vagrant box add cloud-image/ubuntu-24.04
   ```
   
   Note: Canonical no longer provides official Vagrant boxes for Ubuntu 24.04, so this uses a community-maintained box from Vagrant Cloud.

2. Ensure you have:
   - Vagrant installed
   - VirtualBox (or another Vagrant provider)
   - Ansible installed
   - At least 8GB RAM and 4 CPU cores available for the VM

## Usage

1. Navigate to this directory:
   ```bash
   cd openstack/devstack-24.04
   ```

2. Start the VM:
   ```bash
   vagrant up
   ```

3. The Ansible playbook will automatically:
   - Create the `stack` user
   - Clone DevStack stable/2025.2
   - Install DevStack (this takes 30+ minutes)

4. Access the VM:
   ```bash
   vagrant ssh
   ```

5. Once inside, switch to the stack user:
   ```bash
   sudo su - stack
   ```

## Configuration

- **VM IP**: `10.123.123.124` (different from the 22.04 setup to avoid conflicts)
- **VM Name**: `devstack-vm-24.04`
- **DevStack Version**: stable/2025.2
- **Configuration**: See `devstack/local.conf`

## Notes

- Ubuntu 24.04 support in DevStack 2025.2 is available but may require additional testing
- Some plugins may need adjustments for Ubuntu 24.04 compatibility
- The community-maintained Vagrant box may have different characteristics than official boxes

## Troubleshooting

### Keystone Startup Errors

If you encounter a Keystone startup error (common on Ubuntu 24.04), try the following:

1. **Check Keystone logs:**
   ```bash
   sudo tail -f /opt/stack/devstack/logs/keystone.log
   ```

2. **Check if Keystone process is running:**
   ```bash
   ps aux | grep keystone
   ```

3. **Check if port 5000 is in use:**
   ```bash
   sudo netstat -tlnp | grep 5000
   ```

4. **Common fixes for Ubuntu 24.04:**

   a. **Increase service timeout** - Edit `/opt/stack/devstack/devstack/local.conf` and add:
      ```ini
      SERVICE_TIMEOUT=300
      ```

   b. **Check Python version compatibility:**
      ```bash
      python3 --version  # Should be 3.12 on Ubuntu 24.04
      ```

   c. **Restart Keystone manually:**
      ```bash
      cd /opt/stack/devstack
      ./unstack.sh
      ./stack.sh
      ```

   d. **If Keystone keeps failing, try disabling problematic services temporarily** - Add to `local.conf`:
      ```ini
      disable_service tempest
      ```

### General Troubleshooting

If you encounter other issues:
1. Ensure the Vagrant box is added: `vagrant box list | grep ubuntu-24.04`
2. Check VM resources (memory/CPU) are sufficient
3. Review Ansible output for any errors during provisioning
4. Check DevStack logs in `/opt/stack/devstack/logs/` if installation fails
5. Check system logs: `sudo journalctl -xe`
6. Verify network connectivity: `ping 10.123.123.124`

