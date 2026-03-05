import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

export const dbReady = !!supabase
```

Clique **"Confirmar alterações"**.

---

Depois disso apague os 3 arquivos soltos que estão na raiz — clique em cada um deles:
- `App.jsx` → ícone de lixeira 🗑️ → Confirmar
- `main.jsx` → ícone de lixeira 🗑️ → Confirmar  
- `supabase.js` → ícone de lixeira 🗑️ → Confirmar

A estrutura final deve ficar assim:
```
designhub/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── lib/
│       └── supabase.js
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── setup.sql
└── README.md
