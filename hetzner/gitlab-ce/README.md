# Develepment GitLab on Hetzner Server

## Gitlab Server Setup

1. Launch Gitlab-CE Hetzner Server

    [See Hetzner Instructions](https://docs.hetzner.com/cloud/apps/list/gitlab-ce/)

    Use the IP address generated for the DNS entry.

1. Update your Cloudflare DNS entry

    [See Cloudflare DNS](../../cloudflare/dns/README.md) for details.

1. Update the Gitlab-CE Server's Config

    [See Instructions Here](https://docs.gitlab.com/user/ssh/)

    Add port 2222 to GitLab

    ```bash
    sudo vim /etc/gitlab/gitlab.rb
    
    # edit 22 -> 2222
    gitlab_rails['gitlab_shell_ssh_port'] = 2222

    sudo gitlab-ctl reconfigure
    ```

1. Update the Servers SSH Config

    Add `git` as an allowed user.
    ```bash
    sudo vim /etc/ssh/sshd_config.d/ssh-hardening.conf
    
    AllowedUsers ubuntu git
    ```

    Restart the SSH Service
    ```bash
    sudo service ssh restart
    ```

## Connecting from you Machine

Update your local `~/.ssh/config`

```
Host dev.reqtec.com
    HostName dev.reqtec.com
    User git
    Port 2222
    IdentityFile ~/.ssh/id_rsa  # Or your key path
```

Follow more detailed instructions regarding your local [SSH Config](https://docs.gitlab.com/user/ssh/) to generate new keys.