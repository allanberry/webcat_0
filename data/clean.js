const del = require('del');
 

(async () => {
    const deletedPaths = await del(['data/collected']);
 
    console.log('Deleted files and directories:\n', deletedPaths.join('\n'));
})();