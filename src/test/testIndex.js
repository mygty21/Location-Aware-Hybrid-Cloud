const _ = require('lodash');
const babel = require('babel-core');
const beautifier = require('js-beautify').js;
const fs = require('fs');
const fx = require('mkdir-recursive');
const rmdir = require('rmdir');
const test = require('tape');
const yaml = require('js-yaml');
const uuid = require('uuid');

const pluginPath = require.resolve('../parser');

const scratchDir = `${__dirname}/scratch`;
const generatedFiles = [];

test('staging', (t) => {
  fs.stat(scratchDir, (err, stats) => {
    if (err) { // Doesn't exist
      fx.mkdir(scratchDir, (err) => {
        if (err) {
          t.end(err);
        }
        t.pass('Created scratch dir');
        t.end();
      });
    } else {
            // cloud folder already exists check
      t.pass('Scratch dir already exists');
      t.end();
    }
  });
});

test('plugin should extract annotated functions', (t) => {
  babel.transformFileSync(`${__dirname}/fixtures/main.js`, {
    plugins: [
            [pluginPath, { mode: 'extract', output: scratchDir }],
    ],
  });
  t.pass('Plugin runs without crashing');
  t.end();
});

test('plugin should be able to extract a simple function annotated with @cloud', (t) => {
  const input = `
        /* @cloud */
        function myAnnotatedFn() {}

        function notAnnotated() {}
    `;
  const expectedString = `
        'use strict;'
        module.exports.myAnnotatedFn = function(event, context, callback)
        
        {}
    `;

  const fixtureName = `${__dirname}/fixtures/${uuid.v4()}.js`;
  const expectedName = `${__dirname}/fixtures/${uuid.v4()}.js`;

  fs.writeFileSync(fixtureName, input);
  fs.writeFileSync(expectedName, beautifier(expectedString));

  generatedFiles.push(fixtureName);
  generatedFiles.push(expectedName);

  const output = babel.transformFileSync(fixtureName, {
    	plugins: [
            [pluginPath, { mode: 'extract', output: scratchDir }],
    ],
  });

    // Little hack to wait until the post step is done.
    // For some reason the post step execution is not included
    // in the transformFile fn.
  setTimeout(() => {
    const actual = fs.readFileSync(`${scratchDir}/myAnnotatedFn/myAnnotatedFn.js`).toString();
    const expected = fs.readFileSync(expectedName).toString();
    t.equal(actual, expected);
    t.end();
  }, 1000);
});

test('teardown - remove the scratch folder', (t) => {
  rmdir(scratchDir, (err) => {
    if (err) {
      t.fail(err);
    }
    _.forEach(generatedFiles, file => fs.unlinkSync(file));
    t.pass();
    t.end();
  });
});
