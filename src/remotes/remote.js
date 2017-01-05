/** @flow */
import Bit from '../bit';
import { contains, isBitUrl, cleanBang, allSettled } from '../utils';
import { connect } from '../network';
import { InvalidRemote } from './exceptions';
import { BitId, BitIds } from '../bit-id';
import { getContents } from '../tar';
import BitJson from '../bit-json';
import { get as getCache } from '../cache';
import { BitDependencies } from '../scope';
import type { Network } from '../network/network';
import { BIT_JSON } from '../constants';
import { CacheNotFound } from '../cache/exceptions';

function fromTar({ tarball, id }) {
  return getContents(tarball)
    .then((files) => {
      const bitJson = BitJson.fromPlainObject(JSON.parse(files[BIT_JSON]));
      return Bit.loadFromMemory({
        name: id.name,
        bitDir: bitJson.name,
        scope: id.scope,
        bitJson,
        impl: bitJson.getImplBasename() ? files[bitJson.getImplBasename()] : undefined,
        spec: bitJson.getSpecBasename() ? files[bitJson.getSpecBasename()] : undefined
      });
    });
}

/**
 * @ctx bit, primary, remote
 */
function isPrimary(alias: string): boolean {
  return contains(alias, '!');
}

export default class Remote {
  primary: boolean = false;
  host: string;
  name: string;

  constructor(host: string, name: ?string, primary: boolean = false) {
    this.name = name || '';
    this.host = host;
    this.primary = primary;
  }

  connect(): Promise<Network> {
    return connect(this.host);
  }

  toPlainObject() {
    return {
      host: this.host,
      name: this.name
    };
  }

  scope(): Promise<{ name: string }> {
    return this.connect().then((network) => {
      return network.describeScope();
    });
  }

  fetch(bitIds: BitId[]): Promise<BitDependencies[]> {
    return this
      .connect()
      .then(network => network.fetch(bitIds));
  }

  fetchOnes(bitIds: BitIds): Promise<Bit[]> {
    return allSettled(bitIds.map(id => getCache(id)))
      .then((values: {success: boolean, val: Bit, error: CacheNotFound}[]) => {
        const cached = Promise.all(values
          .filter(res => res.success)
          .map(res => fromTar(res.val)));

        const rest = values
          .filter(res => !res.success && res.error.bitId)
          .map(res => res.error.bitId);

        return this
          .connect()
          .then(network => network.fetchOnes(rest))
          .then(bits => Promise.all(bits.map(bit => bit.cache())))
          .then(bits => cached.then(cachedBits => cachedBits.concat(bits)));
      });
  }

  validate() {
    if (!isBitUrl(this.host)) throw new InvalidRemote();
  }

  push(bit: Bit) {
    return connect(this.host).then((network) => {
      return network.push(bit);
    });
  }

  static load(name: string, host: string): Remote {
    const primary = isPrimary(name);
    if (primary) name = cleanBang(name);

    return new Remote(name, host, primary); 
  }
}
