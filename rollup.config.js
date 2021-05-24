import typescript from '@rollup/plugin-typescript';
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import multiInput from "rollup-plugin-multi-input";
import copy from "rollup-plugin-copy";
import babel from "@rollup/plugin-babel";

export default {
  input: ['src/weirdeaux*.ts'],
  external: ['kolmafia'],
  output: {
    dir: 'output',
    format: 'cjs',
    chunkFileNames: 'weirdeaux/[name]-[hash].js',
  },
  context: 'this',
  plugins: [
    multiInput(), typescript(), nodeResolve(), commonjs(), babel({ babelHelpers: 'bundled' }),
    copy({
      targets: [
        { src: 'src/*.ash', dest: 'dist' },
      ]
    })
  ]
}
