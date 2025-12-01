# Deploying Filestash

Filestash is a S3 bucket browsing solution that allows non-administrative users to
gain access for uploading, downloading, and maintaining files.

## Pre-requisites

- **Console Access** ensure you can reach the console and have the appropriate permissions to
  create, update and delete cloud resources.
- **Keypair** is required for access over ansible and SSH. Before you start ensure you have
  this downloaded and configured in the appropriate directory and permissions.
- **Clouds YAML** (clouds.yaml) file is downloaded and configured for openstack client connections.
- **Ansible** familiarity and experience will help you understand how the environment is being
  created.
- **Python 3.12+** on your machine with pip available for package management.

## What we are about to do

If you follow this guide you will:

- **Build an OpenStack environment** with a running Ubuntu 24.04 instance (the standard clouds
  image works fine).
- **Create a private network** that allows you to safely deploy and test.
- **Create a security group** to isolate access to only those IPs allowed.
- **Provide SSH access** to the instance as the `ubuntu` user, with a keypair set up.
- **Run an installation using Ansible** from your control machine (local laptop or a server). Run
  `ansible --version` to check.
- **Deploy Filestash** ready to go, with a `docker-compose.yaml` file.

## Setting Up Your Project

First, let's create a workspace. Create a directory for your Ansible project:

```bash
mkdir filestash
cd filestash
```

Here's how we'll structure it:

```text
filestash-docker/
├── .venv                     # Virtual Environment for Python Dependencies
├── inventory.yaml             # Defines our OpenStack Environment
├── configure.yaml            # Install Configure Docker
├── requirements.txt          # Dependencies Files
└── filestash/                # Your Filestash files
    └── docker-compose.yaml    # Docker Definition
```

### Step 1: Setup your Ansible

Create a file called `requirements.txt`.

```text
ansible-core==2.17.3
python-openstackclient==8.1.0
openstacksdk==4.6.0
```

Create a python virtual environment:

```sh
python -m venv .venv
```

Source the environment:

```sh
source .venv/bin/activate
```

Install the requirements (dependencies):

```sh
pip install -r requirements.txt
```

### Step 2: Build Your Environment

Create a file called `openstack.yaml`.

Replace all "\<values\>" for your specific needs.

[openstack.yaml](./openstack.yamls)

### Step 2: Prepare to Deploy Filestash

#### Configure Your Inventory

Get the IP from the ansible debug message in it:

```sh
ok: [localhost] => {
    "msg": "Server accessible at: <ip address here>. Copy this into your inventory file."
}
```

Create a file `inventory.yaml`. Place the IP from the debug message in it.

[inventory.yaml](./inventory.yaml)

This sets up Ansible to connect to your instance as the `ubuntu` user.

#### Prepare Your Filestash Docker Deployment

Filestash needs a `docker-compose.yaml` to define its services. Create a `filestash`
folder with a simple `docker-compose.yaml`:

[docker-compose.yaml](./filestash/docker-compose.yamls)

Place this in `filestash/docker-compose.yaml`.

> [!NOTE]
> There is currently No Persistence configured in this file.
> When you restart this container it will remove all your data. 
> You will need to configure that to your own environment needs.

### Step 3: Define Your Ansible Playbook

Now, the fun part: the Ansible playbook. This script will:

- Install Docker and Docker Compose.
- Copy Filestash to the server.
- Start it with Docker Compose.

Create `configure.yaml`:

[configure.yaml](./configure.yaml)

This playbook is designed to be idempotent (safe to run multiple times) and handles
everything from package installation to app startup. The `become: no` for the copy and
compose tasks ensures they run as the `ubuntu` user, which is already in the `docker`
group.

### Step 4: Run the Playbook

Time to deploy! From your `filestash` directory, run:

```bash
ansible-playbook -i inventory.yaml configure.yaml
```

Ansible will connect to your instance, install Docker, copy your app to
`/home/ubuntu/filestash`, and start the Filestash in detached mode (`-d`).

### Step 5: Verify It Worked

Once the playbook finishes, SSH into your instance to check:

```console
$ssh ubuntu@<instance-ip>
Welcome to Ubuntu 24.04.2 LTS (GNU/Linux 6.8.0-56-generic x86_64)
...
```

```console
$ ubuntu@...-server:~$ docker ps
CONTAINER ID   IMAGE                       COMMAND            CREATED          STATUS          PORTS                                     NAMES
062121d21b78   machines/filestash:latest   "/app/filestash"   51 minutes ago   Up 51 minutes   0.0.0.0:80->8334/tcp, [::]:80->8334/tcp   filestash
```

If your instance has a public IP, test the app from your browser or
`curl <instance-ip>:80`.

## Configuring Your Filestash for S3

Now that you have a version Filestash deployed you can configure it.

- Navigate to \<instance-ip\> in your browser.
- When presented with the password, enter whatever you like. Hit enter.
  (This password is used to access your administration screen. Save this for later.)
- Follow the guided menu.
- In the left menu, click **Storage**
- From the list remove everything that is not `S3`.
- For **Authentication Middleware** set this to 'PASSTHROUGH'.
- For 'Strategy' set this to 'direct'.
- Under **Attribute Mapping** in 'Related Backend', select 'S3'.
- Input your S3 Credentials.
- Ensure your Path is set correctly (`/`).

## Bonus: Configure Your Persistence

Ensure you are following the Filestash guidance on setting up your persistence layer. Here is
an example from the documentation that includes persistence volumes and much more.

[docker-compose-fs.yaml](./filestash/docker-compose-fs.yaml)

We encourage you to review this docker-compose file and see what might work for your needs.

## Bonus: Configure Authentication Middleware

The options on Filestash Authentication allow users to setup access control through OIDC, LDAP, and other robust controls. See if you can get your Filestash to restrict access based on roles or groups set in your RBAC.

## Tips and Tricks

- **Keep It Secure**: Use OpenStack security groups to restrict access (e.g., allow only
  port 8080). Avoid hardcoding secrets in `docker-compose.yaml`-use environment files or
  a secrets manager.
- **Scale Up**: Got multiple instances? Add them to `inventory.yaml` and run the playbook
  against all at once.
- **Pin Versions**: For consistency, pin Docker versions in the `apt` task (e.g.,
  `docker-ce=5:27.3.1-1~ubuntu.24.04~noble`).
- **Troubleshoot Like a Pro**:
  - SSH issues? Check your key file permissions (`chmod 600 <key-file>`) and security
    group rules.
  - Docker not starting? Look at `/var/log/syslog` or `journalctl -u docker`.
  - App not running? Validate `docker-compose.yaml` and check logs with
    `docker compose logs`.
- **Go Further**: Modularize your playbook with Ansible roles for larger projects, or
  integrate with a CI/CD tool like GitHub Actions.
