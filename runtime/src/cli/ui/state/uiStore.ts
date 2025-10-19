// Shim to support .js extension imports resolving to the .tsx source during transition
// Important: explicitly target the .tsx file to avoid resolving back to this .ts shim
export * from './uiStore.tsx';
