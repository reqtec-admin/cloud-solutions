# FileStash Instructions

```bash
kubectl create ns filestash

kubectl apply -f filestash-pvc.yaml
```

```bash
kubectl apply -f filestash-deployment.yaml
```

```bash
kubectl apply -f filestash-svc.yaml
```

Get the Floating IP from the Loadbalancer (name includes flexify).

Navigate in a web browser to the floating ip and you should see a page to set your user/password.
