# Flexify IO Instructions

```bash
kubectl create ns flexifyio

kubectl apply -f flexify-pvc.yaml
```

```bash
kubectl apply -f flexify-deployment.yaml
```

```bash
kubectl apply -f flexify-service.yaml
```

Get the Floating IP from the Loadbalancer (name includes flexify).

Navigate in a web browser to the floating ip and you should see a page to set your user/password.
