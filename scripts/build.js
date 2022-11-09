import chalk from 'chalk';
import fs from 'fs-extra';
import elapsed from 'elapsed-time-logger';
import buildJsCore from './build-js-core.js';
import buildJsBundle from './build-js-bundle.js';
import buildTypes from './build-types.js';
import buildReact from './build-react.js';
import buildVue from './build-vue.js';
import buildElement from './build-element.js';
import buildStyles from './build-styles.js';
import outputCheckSize from './check-size.js';
import { outputDir } from './utils/output-dir.js';

class Build {
  constructor() {
    this.argv = process.argv.slice(2).map((v) => v.toLowerCase());
    this.size = this.argv.includes('--size');
    this.tasks = [];
    // eslint-disable-next-line no-constructor-return
    return this;
  }

  add(flag, buildFn) {
    if (!this.argv.includes('--only') || this.argv.includes(flag)) {
      this.tasks.push(() => buildFn());
    }
    return this;
  }

  async run() {
    if (!this.argv.includes('--only')) {
      await fs.remove(`./${outputDir}`);
      await fs.ensureDir(`./${outputDir}`);
    }
    await fs.copy('./src/copy/', `./${outputDir}`);
    let start;
    let end;
    if (this.size) {
      start = outputCheckSize();
    }
    try {
      for (const buildFn of this.tasks) {
        await buildFn(); // eslint-disable-line
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }

    if (this.size) {
      const sizeMessage = (value, label = '') =>
        `difference ${label}: ${value > 0 ? chalk.red(`+${value}`) : chalk.green(value)} bytes`;
      end = outputCheckSize();
      console.log(sizeMessage(end.size - start.size));
      console.log(sizeMessage(end.gzippedSize - start.gzippedSize, 'gzipped'));
    }
    return true;
  }
}
(async () => {
  elapsed.start('build');
  const build = new Build();
  await build
    .add('types', buildTypes)
    .add('styles', buildStyles)
    .add('core', buildJsCore)
    .add('bundle', buildJsBundle)
    .add('element', buildElement)
    .add('react', buildReact)
    .add('vue', buildVue)
    .run();
  elapsed.end('build', chalk.bold.green('Build completed'));
})();
