mkdir packages
cp ../flow.package packages

echo "BUILDING"
docker-compose --project-name flow build

echo "TAGGING"
docker tag flow_web totalplatform/flow:latest

echo "PUSHING"
docker push totalplatform/flow:latest

rm -r packages
echo "DONE"