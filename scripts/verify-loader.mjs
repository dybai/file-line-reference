// Throwaway loader simulation: verify the generated client.js activates under
// the real ModuleLoader calling convention (factory(require) -> exports).
// Scope: factory-time only — it does NOT run apply(), so slot/service wiring
// is covered by the live GUI, not here.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync('client.js', 'utf8');
let registered = null;
const logs = [];
const sandbox = {
	window: {
		__ModuleLoader__: { load: (def) => { registered = def; } },
		localStorage: { getItem: () => '1', setItem: () => {} }
	},
	document: { documentElement: { classList: { toggle: () => {}, remove: () => {} } } },
	Symbol,
	Object,
	console: { info: (m) => logs.push(m), error: () => {} }
};
vm.runInNewContext(code, sandbox, { filename: 'client.js' });
if (!registered) throw new Error('factory never registered');
const fakeReact = {
	createElement: () => ({}),
	useEffect: () => {},
	useRef: () => ({ current: null }),
	useReducer: () => [0, () => {}],
	Component: class {}
};
const fakeRequire = (spec) => {
	if (spec === 'react') return fakeReact;
	throw new Error('unexpected require(' + spec + ')');
};
const exported = registered.factory(fakeRequire);
console.log('exports:', Object.keys(exported).join(','), Object.prototype.toString.call(exported));
console.log('factory-time logs:', logs.join(' | '));
console.log('shift binding present:', code.includes(String.raw`modifiers: ['primary', 'shift']`));
console.log('boundary present:', code.includes('ToolbarBoundary'));
