import typescript from '@rollup/plugin-typescript';
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import multiInput from "rollup-plugin-multi-input";
import copy from "rollup-plugin-copy";

export default {
  input: ['src/weirdeaux*.ts'],
  external: ['kolmafia'],
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    multiInput(), typescript(), nodeResolve(), commonjs(),
    copy({
      targets: [
        { src: 'src/*.ash', dest: 'dist' },
      ]
    })
  ]
}
