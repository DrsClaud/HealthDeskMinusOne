import capitalize from '../utils/helpers/capitalize';
import { getAddress } from '../utils/helpers/getAddress';
import { getStateCode } from '../utils/helpers/getStateCode';
import loadScripts from '../utils/helpers/loadScripts';

describe('capitalize', () => {
  it('capitalizes each word', () => {
    expect(capitalize('hello world')).toBe('Hello World');
  });
});

describe('getAddress', () => {
  it('returns properties.address when present', () => {
    expect(getAddress({ properties: { address: '123 Main St' } })).toBe('123 Main St');
  });
  it('returns address + text when no properties.address', () => {
    expect(getAddress({ address: '123', text: 'Main St' })).toBe('123 Main St');
  });
  it('returns undefined when no address or properties', () => {
    expect(getAddress({})).toBeUndefined();
  });
});

describe('getStateCode', () => {
  it('returns state code from region short_code', () => {
    const location = {
      context: [
        { id: 'region.123', short_code: 'US-NY' },
      ],
    };
    expect(getStateCode(location)).toBe('NY');
  });
  it('returns undefined when no context', () => {
    expect(getStateCode({})).toBeUndefined();
  });
});

describe('loadScripts', () => {
  it('appends script when id not present and calls callback when script exists', () => {
    const callback = jest.fn();
    const id = 'test-script-' + Date.now();
    loadScripts(id, 'void 0', callback);
    expect(document.getElementById(id)).toBeTruthy();
    expect(document.getElementById(id).innerHTML).toBe('void 0');
    loadScripts(id, 'void 0', callback);
    expect(callback).toHaveBeenCalled();
  });
});
