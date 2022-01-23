mkdir -p .bundle

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../modules/ modules
cp -a ../schemas/ schemas
cp -a ../public/ public
cp -a ../views/ views

# cd ..
total4 --bundle flow.bundle
cp flow.bundle ../flow.bundle

cd ..
rm -rf .bundle
echo "DONE"