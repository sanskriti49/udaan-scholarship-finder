const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const fontClasses = [
    'font-inter',
    'font-dmsans',
    'font-pangea',
    'font-clash',
    'font-satoshi',
    'font-mcqueen',
    'font-raleway',
    'font-lato',
    'font-jakarta',
    'font-merriweather',
    'font-urbanist',
    'font-sans'
];

const files = walk('frontend/src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    fontClasses.forEach(cls => {
        const regex = new RegExp(`\\s*\\b${cls}\\b\\s*`, 'g');
        if (content.match(regex)) {
            content = content.replace(regex, ' ');
            modified = true;
        }
    });

    if (modified) {
        // Clean up double spaces in classNames
        content = content.replace(/className="\s+/g, 'className="');
        content = content.replace(/\s+"/g, '"');
        content = content.replace(/  +/g, ' '); 
        fs.writeFileSync(file, content);
        console.log('Cleaned fonts from ' + file);
    }
});
