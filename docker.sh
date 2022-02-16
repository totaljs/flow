echo "BUILDING"
docker-compose build

echo "TAGGING"
docker tag flow_web totalplatform/flow:latest

echo "PUSHING"
docker push totalplatform/flow:latest

echo "DONE"