#!/bin/bash
# Diagnostic script for Keystone startup issues on Ubuntu 24.04

echo "=== DevStack Keystone Diagnostic Script ==="
echo ""

echo "1. Checking Keystone process..."
ps aux | grep -i keystone | grep -v grep || echo "   No Keystone process found"
echo ""

echo "2. Checking Keystone port (5000)..."
sudo netstat -tlnp | grep 5000 || echo "   Port 5000 not in use"
echo ""

echo "3. Checking Keystone logs (last 50 lines)..."
if [ -f /opt/stack/devstack/logs/keystone.log ]; then
    echo "   Recent Keystone log entries:"
    tail -50 /opt/stack/devstack/logs/keystone.log
else
    echo "   Keystone log file not found"
fi
echo ""

echo "4. Checking Python version..."
python3 --version
echo ""

echo "5. Checking if Keystone service files exist..."
ls -la /opt/stack/devstack/logs/ | grep keystone || echo "   No Keystone log files found"
echo ""

echo "6. Checking system resources..."
free -h
echo ""

echo "7. Checking systemd services..."
sudo systemctl list-units | grep -i keystone || echo "   No Keystone systemd services found"
echo ""

echo "8. Checking recent system logs..."
sudo journalctl -n 50 | grep -i keystone || echo "   No recent Keystone entries in system logs"
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "To manually restart Keystone:"
echo "  cd /opt/stack/devstack"
echo "  ./unstack.sh"
echo "  ./stack.sh"

