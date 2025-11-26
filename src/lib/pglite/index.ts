export { PGliteInitProvider, usePGlite } from './init'
export { PGliteSchemaProvider } from './init-schema'

// Accept HMR updates without reloading
if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('PGlite module updated')
    })
}
