/** @flow */
import Command from '../command';
import { toBase64, fromBase64 } from '../../utils';
import { fetch } from '../../api';
import { BitDependencies } from '../../scope';

export default class Fetch extends Command {
  name = '_fetch <path> <ids...>';
  private = true;
  description = 'fetch bit components(s) from a scope';
  alias = '';
  opts = [];

  action([path, ids, ]: [string, string[], ]): Promise<any> {
    return fetch(fromBase64(path), ids.map(fromBase64));
  }

  report(bitDependencies: BitDependencies[]): string {
    return bitDependencies.map((bitDep) => {
      return toBase64(JSON.stringify({
        bit: bitDep.bit.toTar(),
        dependencies: bitDep.dependencies.map(bit => bit.toTar()) 
      }));
    }).join('!!!');
  }
}
