mkdir -p .bundle

cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../modules/ modules
cp -a ../schemas/ schemas
cp -a ../public/ public
cp -a ../views/ views
cp -a ../resources/ resources

# cd ..
total5 --bundle app.bundle
cp app.bundle ../app.bundle

cd ..
rm -rf .bundle