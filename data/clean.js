const del = require('del');
 

(async () => {
    const deletedPaths = await del([
        'data/collected/screenshots',
        'data/collected/colleges.db',
        'data/collected/libraries.db',
        'data/collected/pages.db',
        'data/collected/visits.db',
        'log/download.log',
        'log/timeouts.log',
        'log/visit.log',
        // 'data/collected/builtwith.db'
    ]);
 
    console.log('Deleted files and directories:\n', deletedPaths.join('\n'));
})();