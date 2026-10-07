import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Default app build (dev server + standalone SPA)
  if (mode !== 'lib') {
    return {
      plugins: [react()],
    }
  }

  // Library build: pnpm run build:lib
  return {
    plugins: [
      react(),
      dts({
        include: ['src'],
        rollupTypes: true,
        tsconfigPath: './tsconfig.app.json',
      }),
    ],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
        fileName: 'solar-jiji-editor',
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-dom/client',
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
    },
  }
})
