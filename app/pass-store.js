import fs from 'fs';
import os from 'os';
import path from 'path';

import _ from 'lodash';
import LRU from 'lru-cache';
import Promise from 'bluebird';
import walk from 'walkdir';

import GPGAdapter from './gpg-adapter';

export default class PassStore {
  constructor(options) {
    this.options = _.defaults(options, {
      passStorePath: `${os.homedir()}/.password-store`
    });

    this.gpgAdapter = new GPGAdapter(options);
  }

  loadEntries() {
    const {passStorePath} = this.options;

    return new Promise( (resolve, reject) => {
      const entries = [];

      const events = walk(passStorePath, {follow_symlinks: true}, function(filename, stat) {
        if (filename.endsWith('.git')) {
          this.ignore(filename);
        }

        if (stat.isFile()) {
          entries.push({
            id: filename,
            realpath: filename,
            relativePath: resolveRelativePath(passStorePath, filename)
          });
        }
      });

      events.on('end', () => {
        resolve(this.filterEntries(entries));
      });

      events.on('error', (path, err) => {
        reject(err);
      });
    });
  }

  filterEntries(entries) {
    return entries.filter( ({realpath}) => {
      return realpath.endsWith('.gpg');
    });
  }

  decryptEntry({realpath}) {
    this.gpgAdapter.decryptFile(realpath).then( ({stdout}) => {
      alert(stdout);
    }).catch( err => {
      alert(`${err.message}: ${err.stderr}`);
    });
  }
}

const realpathCache = LRU();

function resolveRelativePath(from, to) {
  let realpath = realpathCache.get(from);

  if (!realpath) {
    realpath = fs.realpathSync(from);
  }

  return path.relative(realpath, to);
}