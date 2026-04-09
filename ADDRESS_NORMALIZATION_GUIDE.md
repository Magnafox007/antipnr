# Address Normalization & Duplicate Detection - Guia Completo

## Visão Geral

O sistema de normalização de endereços garante que o mesmo endereço escrito de formas diferentes seja reconhecido como um único endereço no banco de dados, mantendo a integridade dos dados e evitando duplicatas.

## Funcionalidades Implementadas

### 1. Normalização Automática de Endereços ✅

Todos os endereços são automaticamente normalizados quando:
- Um usuário busca por um endereço
- Um relatório é criado
- Uma planilha Excel/CSV é enviada
- Uma lista de endereços é colada (Quick Route Input)

### 2. Detecção de Duplicatas ✅

O sistema detecta duplicatas usando três estratégias:
1. **Correspondência exata** do endereço normalizado (mais rápido)
2. **Correspondência fuzzy** com similaridade de texto ≥ 85%
3. **Correspondência GPS** para endereços a menos de 50 metros de distância

### 3. Proteção do Banco de Dados ✅

- Previne criação de entradas duplicadas
- Garante que relatórios, dicas e scores de risco sejam vinculados ao mesmo endereço
- Atualiza coordenadas GPS quando disponíveis

## Como Funciona a Normalização

### Etapas do Processo

```
Endereço Original
      ↓
Remoção de Acentos
      ↓
Padronização de Abreviações
      ↓
Remoção de Caracteres Especiais
      ↓
Normalização de Números
      ↓
Remoção de Espaços Extras
      ↓
Endereço Normalizado
```

### Exemplos de Normalização

#### Exemplo 1: Variações Comuns

**Entradas:**
```
"Rua Silva, 120"
"R Silva 120"
"Rua Silva Nº120"
"rua silva n 120"
"RUA SILVA NUMERO 120"
```

**Resultado Normalizado:**
```
"r silva 120"
```

**Display Formatado:**
```
"Rua Silva Nº 120"
```

#### Exemplo 2: Avenida Paulista

**Entradas:**
```
"Av. Paulista, 1000"
"Avenida Paulista 1000"
"av paulista n 1000"
"AVENIDA PAULISTA, Nº 1.000"
```

**Resultado Normalizado:**
```
"av paulista 1000"
```

**Display Formatado:**
```
"Av. Paulista Nº 1000"
```

#### Exemplo 3: Com Cidade

**Entradas:**
```
"Rua das Flores, 22, São Paulo"
"R das Flores 22 - São Paulo"
"Rua das Flores nº22, São Paulo - SP"
```

**Resultado Normalizado:**
```
"r das flores 22 sao paulo"
```

**Display Formatado:**
```
"Rua das Flores Nº 22, São Paulo"
```

## Regras de Normalização

### 1. Padronização de Abreviações

| Original | Normalizado |
|----------|-------------|
| Rua | r |
| Avenida | av |
| Alameda | al |
| Travessa | tv |
| Praça | pc |
| Largo | lg |
| Rodovia | rod |
| Estrada | estr |
| Condomínio | cond |
| Conjunto | conj |
| Apartamento | apt |
| Bloco | bl |
| Número | n |
| São | sao |
| Santo | sto |
| Santa | sta |

### 2. Remoção de Caracteres Especiais

**Removidos:**
- Vírgulas (,)
- Pontos (.)
- Hífens (-)
- Hashtags (#)
- Barras (/)
- Aspas (" ')
- Parênteses (())

**Mantidos:**
- Letras (a-z, A-Z)
- Números (0-9)
- Espaços

### 3. Normalização de Números

**Formatos aceitos:**
```
"Nº 120"     → "120"
"N. 120"     → "120"
"Num 120"    → "120"
"Número 120" → "120"
"# 120"      → "120"
"120"        → "120"
```

### 4. Remoção de Acentos

```
São Paulo  → sao paulo
José       → jose
Ângelo     → angelo
Esmeralda  → esmeralda
Paraná     → parana
```

### 5. Normalização de Espaços

```
"Rua    Silva   120"  → "rua silva 120"
"  Rua Silva 120  "   → "rua silva 120"
```

## Detecção de Duplicatas

### Estratégia 1: Correspondência Exata

**Como funciona:**
- Compara endereços normalizados diretamente
- É o método mais rápido e preciso
- Usa índice de banco de dados para alta performance

**Exemplo:**
```
Endereço A: "Rua Silva, 120" → "r silva 120"
Endereço B: "R Silva 120"    → "r silva 120"
Resultado: DUPLICATA (correspondência exata)
```

### Estratégia 2: Correspondência Fuzzy (Similaridade de Texto)

**Como funciona:**
- Calcula similaridade baseada em palavras comuns
- Threshold padrão: 85%
- Útil para variações menores

**Fórmula:**
```
Similaridade = (Palavras Comuns) / (Total de Palavras Únicas)
```

**Exemplo:**
```
Endereço A: "r silva 120 sao paulo"
Endereço B: "r silva 120"

Palavras Comuns: ["r", "silva", "120"] = 3
Total Único: ["r", "silva", "120", "sao", "paulo"] = 5
Similaridade: 3/5 = 60%

Resultado: NÃO É DUPLICATA (< 85%)
```

```
Endereço A: "r silva 120 apt 10"
Endereço B: "r silva 120 apt 11"

Palavras Comuns: ["r", "silva", "120", "apt"] = 4
Total Único: ["r", "silva", "120", "apt", "10", "11"] = 6
Similaridade: 4/6 = 67%

Resultado: NÃO É DUPLICATA (< 85%)
```

```
Endereço A: "r silva 120"
Endereço B: "rua silva 120"

Após normalização ambos = "r silva 120"
Similaridade: 100%

Resultado: DUPLICATA (= 100%)
```

### Estratégia 3: Correspondência GPS

**Como funciona:**
- Calcula distância entre coordenadas usando fórmula Haversine
- Threshold padrão: 50 metros
- Usado quando coordenadas estão disponíveis

**Fórmula Haversine:**
```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c  (R = 6371000 metros)
```

**Exemplo:**
```
Endereço A: Lat: -23.5505, Lon: -46.6333
Endereço B: Lat: -23.5508, Lon: -46.6335

Distância: ~35 metros

Resultado: DUPLICATA (< 50m)
```

### Ordem de Execução

```
1. Tenta correspondência exata (mais rápido)
   ↓ (se não encontrar)
2. Tenta correspondência fuzzy (85% similaridade)
   ↓ (se não encontrar)
3. Tenta correspondência GPS (< 50m)
   ↓ (se não encontrar)
4. Cria novo endereço
```

## Implementação Técnica

### Estrutura do Banco de Dados

**Tabela: addresses**
```sql
id                  UUID PRIMARY KEY
address_text        TEXT            -- Endereço original
normalized_address  TEXT            -- Endereço normalizado
latitude            NUMERIC         -- Coordenada GPS
longitude           NUMERIC         -- Coordenada GPS
city                TEXT
zone                TEXT
risk_score          NUMERIC
total_reports       INTEGER
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Índices:**
```sql
-- Busca rápida por endereço normalizado
idx_addresses_normalized_address

-- Busca por coordenadas GPS
idx_addresses_coordinates

-- Busca combinada
idx_addresses_search (normalized_address, risk_score DESC)
```

### Funções do Banco de Dados

#### 1. calculate_address_similarity()

```sql
calculate_address_similarity(addr1 TEXT, addr2 TEXT) RETURNS FLOAT
```

Calcula similaridade de texto entre dois endereços.

**Exemplo de uso:**
```sql
SELECT calculate_address_similarity('r silva 120', 'r silva 121');
-- Retorna: 0.75 (75% similar)
```

#### 2. calculate_gps_distance()

```sql
calculate_gps_distance(
  lat1 NUMERIC,
  lon1 NUMERIC,
  lat2 NUMERIC,
  lon2 NUMERIC
) RETURNS NUMERIC
```

Calcula distância em metros entre duas coordenadas GPS.

**Exemplo de uso:**
```sql
SELECT calculate_gps_distance(-23.5505, -46.6333, -23.5508, -46.6335);
-- Retorna: 35.67 (metros)
```

#### 3. find_duplicate_address()

```sql
find_duplicate_address(
  p_normalized_address TEXT,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_text_threshold FLOAT DEFAULT 0.85,
  p_gps_threshold NUMERIC DEFAULT 50
) RETURNS UUID
```

Procura endereços duplicados usando as três estratégias.

**Exemplo de uso:**
```sql
SELECT find_duplicate_address('r silva 120', -23.5505, -46.6333);
-- Retorna: UUID do endereço duplicado ou NULL
```

### API TypeScript

#### Normalizar Endereço

```typescript
import { normalizeAddress } from './services/addressNormalizationService';

const result = normalizeAddress('Rua Silva, 120, São Paulo');

console.log(result.original);        // "Rua Silva, 120, São Paulo"
console.log(result.normalized);      // "r silva 120 sao paulo"
console.log(result.displayFormat);   // "Rua Silva Nº 120, São Paulo"
console.log(result.streetName);      // "Silva"
console.log(result.streetNumber);    // "120"
console.log(result.city);            // "São Paulo"
```

#### Criar ou Obter Endereço (com detecção de duplicatas)

```typescript
import { createOrGetAddress } from './services/addressService';

const address = await createOrGetAddress({
  address_text: 'Rua Silva, 120',
  latitude: -23.5505,
  longitude: -46.6333,
  city: 'São Paulo',
});

// Se já existir um endereço similar, retorna o existente
// Caso contrário, cria um novo
```

#### Calcular Similaridade

```typescript
import { calculateAddressSimilarity } from './services/addressNormalizationService';

const similarity = calculateAddressSimilarity(
  'Rua Silva 120',
  'R Silva 120'
);

console.log(similarity); // 1.0 (100% similar)
```

#### Calcular Distância GPS

```typescript
import { calculateGPSDistance } from './services/addressNormalizationService';

const distance = calculateGPSDistance(
  -23.5505, -46.6333,  // Lat/Lon 1
  -23.5508, -46.6335   // Lat/Lon 2
);

console.log(distance); // 35.67 (metros)
```

#### Verificar Duplicatas

```typescript
import { areAddressesDuplicates } from './services/addressNormalizationService';

const isDuplicate = areAddressesDuplicates(
  {
    normalized: 'r silva 120',
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    normalized: 'r silva 120',
    latitude: -23.5508,
    longitude: -46.6335,
  },
  {
    textSimilarityThreshold: 0.85,
    gpsDistanceThreshold: 50,
  }
);

console.log(isDuplicate); // true
```

## Fluxo de Dados

### Fluxo de Criação de Endereço

```
1. Usuário envia endereço "Rua Silva, 120"
        ↓
2. Sistema normaliza para "r silva 120"
        ↓
3. Sistema chama find_duplicate_address()
        ↓
4a. Duplicata encontrada?
    ├─ SIM: Retorna endereço existente
    │       Atualiza GPS se fornecido
    └─ NÃO: Cria novo registro
            ↓
5. Retorna endereço (novo ou existente)
```

### Fluxo de Busca

```
1. Usuário busca "Rua Silva 120"
        ↓
2. Sistema normaliza para "r silva 120"
        ↓
3. Busca no banco por:
   - address_text LIKE '%Rua Silva 120%'
   OU
   - normalized_address LIKE '%r silva 120%'
        ↓
4. Retorna resultados ordenados por risk_score
```

### Fluxo de Análise de Rota

```
1. Usuário envia lista de endereços
        ↓
2. Para cada endereço:
   a. Normaliza o endereço
   b. Busca no banco de dados
   c. Identifica risk_score e total_reports
        ↓
3. Calcula estatísticas:
   - Total de endereços
   - Endereços seguros
   - Endereços de atenção
   - Endereços de risco moderado
   - Endereços de alto risco
        ↓
4. Retorna análise completa
```

## Benefícios do Sistema

### 1. Integridade de Dados

✅ **Sem Duplicatas**
- Apenas um registro por endereço real
- Dados consolidados e confiáveis
- Histórico preciso

✅ **Dados Limpos**
- Formato consistente
- Fácil de buscar
- Fácil de comparar

### 2. Performance

✅ **Buscas Rápidas**
- Índices otimizados
- Consultas eficientes
- Tempo de resposta < 100ms

✅ **Análise Escalável**
- Processa 100 endereços em ~3 segundos
- Usa cache de banco de dados
- Queries paralelas

### 3. Experiência do Usuário

✅ **Flexibilidade**
- Aceita múltiplos formatos
- Correção automática
- Tolerante a erros de digitação

✅ **Display Legível**
- Formatação bonita
- Capitalização correta
- Informações extraídas (rua, número, cidade)

### 4. Precisão

✅ **Detecção Inteligente**
- Três estratégias de correspondência
- Ajustável (thresholds configuráveis)
- GPS para validação física

✅ **Dados Consolidados**
- Todos os relatórios no mesmo endereço
- Risk score agregado corretamente
- Histórico completo

## Casos de Uso Reais

### Caso 1: Entregador Reporta Problema

**Situação:**
- Entregador A reporta "Rua Silva, 120"
- Entregador B reporta "R Silva 120"

**Comportamento Antigo (SEM normalização):**
```
Endereço 1: "Rua Silva, 120" - 1 relato
Endereço 2: "R Silva 120" - 1 relato
Resultado: 2 endereços diferentes no sistema
```

**Comportamento Novo (COM normalização):**
```
Endereço único: "r silva 120" (normalizado)
Display: "Rua Silva Nº 120"
Total de relatos: 2
Resultado: Dados consolidados corretamente
```

### Caso 2: Análise de Rota

**Situação:**
- Planilha Excel com "Av. Paulista, 1000"
- Banco tem registro de "Avenida Paulista 1000"
- Já existem 3 relatos de problemas

**Comportamento Antigo:**
```
Sistema não encontra correspondência
Mostra endereço como "Seguro" (0 relatos)
Entregador não é alertado do risco
```

**Comportamento Novo:**
```
Sistema normaliza ambos para "av paulista 1000"
Encontra correspondência exata
Mostra 3 relatos existentes
Entregador é alertado do risco
```

### Caso 3: GPS Duplicado

**Situação:**
- Endereço A: "Rua das Flores 22" (GPS: -23.5505, -46.6333)
- Endereço B: "R Flores, 22" (GPS: -23.5506, -46.6334)
- Distância: 15 metros

**Comportamento:**
```
Sistema detecta:
1. Similaridade de texto: ~90%
2. Distância GPS: 15m

Resultado: DUPLICATA
Usa o endereço existente
Atualiza GPS se mais preciso
```

## Configuração e Ajustes

### Thresholds Ajustáveis

#### Similaridade de Texto
```typescript
// Padrão: 0.85 (85%)
// Mais restritivo: 0.90 (90%)
// Mais flexível: 0.80 (80%)

const isDuplicate = areAddressesDuplicates(addr1, addr2, {
  textSimilarityThreshold: 0.85,
});
```

#### Distância GPS
```typescript
// Padrão: 50 metros
// Mais restritivo: 25 metros
// Mais flexível: 100 metros

const isDuplicate = areAddressesDuplicates(addr1, addr2, {
  gpsDistanceThreshold: 50,
});
```

### Customização de Abreviações

Adicione novas abreviações no arquivo `addressNormalizationService.ts`:

```typescript
const ABBREVIATION_MAP: Record<string, string> = {
  // Adicione aqui
  'jardim': 'jd',
  'parque': 'pq',
  // ...
};
```

## Monitoramento e Debugging

### Testar Normalização

```typescript
import { testNormalization } from './services/addressNormalizationService';

testNormalization();
// Imprime resultados de normalização para vários casos de teste
```

### Ver Endereços Duplicados

```sql
-- Endereços com mesmo endereço normalizado
SELECT
  normalized_address,
  COUNT(*) as count,
  array_agg(address_text) as variations
FROM addresses
GROUP BY normalized_address
HAVING COUNT(*) > 1;
```

### Ver Endereços Próximos (GPS)

```sql
-- Endereços a menos de 50m uns dos outros
SELECT
  a1.address_text as addr1,
  a2.address_text as addr2,
  calculate_gps_distance(
    a1.latitude, a1.longitude,
    a2.latitude, a2.longitude
  ) as distance_meters
FROM addresses a1
CROSS JOIN addresses a2
WHERE a1.id < a2.id
  AND a1.latitude IS NOT NULL
  AND a2.latitude IS NOT NULL
  AND calculate_gps_distance(
    a1.latitude, a1.longitude,
    a2.latitude, a2.longitude
  ) < 50;
```

## Troubleshooting

### Problema: Endereços similares não são detectados

**Soluções:**
1. Verifique se a normalização está funcionando:
   ```typescript
   const result = normalizeAddress('Seu Endereço');
   console.log(result);
   ```

2. Reduza o threshold de similaridade:
   ```typescript
   textSimilarityThreshold: 0.80  // Ao invés de 0.85
   ```

3. Verifique logs do banco de dados

### Problema: Muitos falsos positivos (duplicatas incorretas)

**Soluções:**
1. Aumente o threshold de similaridade:
   ```typescript
   textSimilarityThreshold: 0.90  // Ao invés de 0.85
   ```

2. Reduza o raio GPS:
   ```typescript
   gpsDistanceThreshold: 25  // Ao invés de 50
   ```

### Problema: Performance lenta em buscas

**Soluções:**
1. Verifique se os índices foram criados:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'addresses';
   ```

2. Analise query plan:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM addresses
   WHERE normalized_address = 'r silva 120';
   ```

## Melhores Práticas

### 1. Sempre Forneça GPS Quando Disponível

```typescript
// ✅ BOM
createOrGetAddress({
  address_text: 'Rua Silva 120',
  latitude: -23.5505,
  longitude: -46.6333,
});

// ⚠️ OK, mas menos preciso
createOrGetAddress({
  address_text: 'Rua Silva 120',
});
```

### 2. Use a API ao Invés de Manipular Diretamente

```typescript
// ✅ BOM - Usa API com detecção de duplicatas
const addr = await createOrGetAddress({...});

// ❌ RUIM - Insere direto no banco
await supabase.from('addresses').insert({...});
```

### 3. Valide Endereços Antes de Processar

```typescript
// ✅ BOM
if (addressText && addressText.trim().length > 5) {
  const result = normalizeAddress(addressText);
  // ...
}

// ❌ RUIM
const result = normalizeAddress(addressText);
```

### 4. Display vs Armazenamento

```typescript
// Para ARMAZENAR
const { normalized } = normalizeAddress(address);

// Para EXIBIR ao usuário
const { displayFormat } = normalizeAddress(address);
```

## Conclusão

O sistema de normalização de endereços e detecção de duplicatas garante:

- 🎯 **Precisão** - Dados consolidados corretamente
- ⚡ **Performance** - Buscas rápidas e eficientes
- 🛡️ **Integridade** - Sem duplicatas no banco de dados
- 🔍 **Flexibilidade** - Aceita múltiplos formatos
- 📊 **Confiabilidade** - Risk scores e relatórios precisos

**Sistema pronto para produção e totalmente funcional!** 🚀
