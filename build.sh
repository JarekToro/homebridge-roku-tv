PKG=`basename $PWD`
BASEDIR=`dirname $PWD`
PLUGIN=$PKG-plugin
DEST=$BASEDIR/$PLUGIN
echo building to $DEST
rm -rf $DEST
if [ ! -d node_modules ]; then 
	npm ci --verbose || exit; 
fi
npm run build --verbose || exit
mkdir -p $DEST || exit
for f in *; do
 	if [ "$f" != "node_modules" ] && [ "$f" != "build.sh" ]; then 
		cp -rv $f $DEST
	fi
done
cd $DEST || exit
npm pkg delete devDependencies || exit
cd $BASEDIR || exit
tar -zcvf $PLUGIN.tar.gz $PLUGIN || exit
rm -rf $DEST
