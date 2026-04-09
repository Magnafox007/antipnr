# Sample Files for Route Analyzer Testing

This document explains the sample files included for testing the Route Analyzer feature.

## Available Sample Files

### 1. sample-addresses.txt

A plain text file containing 15 sample delivery addresses in São Paulo.

**Format:** Plain text (one address per line)

**Structure:**
```
Rua Silva 120, São Paulo
Av Brasil 450, São Paulo
...
```

**How to use:**
1. Open `sample-addresses.txt`
2. Copy all addresses (Ctrl+A, Ctrl+C)
3. Open the AntiPNR app
4. Go to the Route tab
5. Make sure "Colar Endereços" mode is selected
6. Paste in the text area
7. Tap "Análise Rápida"

### 2. sample-route.csv

A CSV file containing 15 sample delivery addresses in São Paulo.

**Format:** CSV (Comma-Separated Values)

**Structure:**
```csv
Address
Rua das Flores, 123, São Paulo
Av. Paulista, 1000, São Paulo
...
```

**How to use:**
1. Open the AntiPNR app
2. Go to the Route tab
3. Tap "Selecionar Arquivo"
4. Choose `sample-route.csv`
5. Tap "Analisar Rota"

## Creating Your Own Test Files

### CSV Format

Create a CSV file with the following structure:

**Option 1: Full Address**
```csv
Address
Your full address here
Another address
```

**Option 2: Separate Fields**
```csv
Street,Number,City
Rua das Flores,123,São Paulo
Av. Paulista,1000,São Paulo
```

### Excel Format (.xlsx)

Create an Excel spreadsheet with columns:

| Address |
|---------|
| Rua das Flores, 123, São Paulo |
| Av. Paulista, 1000, São Paulo |

Or with separate columns:

| Street | Number | City |
|--------|--------|------|
| Rua das Flores | 123 | São Paulo |
| Av. Paulista | 1000 | São Paulo |

## Column Names

The system recognizes the following column names (case-insensitive):

**For Full Address:**
- Address
- Endereco
- ENDERECO

**For Street:**
- Street
- Rua
- RUA

**For Number:**
- Number
- Numero
- NUMERO

**For City:**
- City
- Cidade
- CIDADE

## Tips for Creating Route Files

1. **Keep it simple** - Use clear, complete addresses
2. **One address per line** - Don't combine multiple deliveries
3. **Include city** - Helps with accurate matching
4. **Consistent format** - Use the same format for all addresses
5. **Check for typos** - Spelling mistakes may prevent matches

## Exporting from Delivery Platforms

### iFood
1. Go to your delivery list
2. Export to CSV or Excel
3. Make sure address column is included

### Rappi
1. Access your route
2. Download delivery list
3. Format should be compatible

### Shopee
1. Export order list
2. Extract address column
3. Save as CSV or Excel

### Mercado Livre
1. Export shipping list
2. Keep address field
3. Save in supported format

## Testing with Sample Data

The included `sample-route.csv` contains addresses that you can test with:

1. **Safe addresses** - New addresses with no reports
2. **At-risk addresses** - If any have been reported in the database
3. **Multiple locations** - Different areas of São Paulo

## Troubleshooting

**Problem:** File not recognized
- Check file extension (.csv or .xlsx)
- Verify column names match expected format
- Open file to ensure it's not corrupted

**Problem:** No addresses parsed
- Make sure there's data in the file
- Check that column headers are correct
- Verify addresses are not empty

**Problem:** All addresses show as safe
- This is expected for new addresses
- Only addresses with reports show risk levels
- Try adding a report first, then test

## Creating Test Scenarios

To test the full functionality:

1. **Add reports** to some addresses in the database
2. **Export a route** with those addresses
3. **Upload and analyze** to see risk detection
4. **Verify colors** match risk levels

## Performance Testing

The Route Analyzer can handle:

- ✅ Up to 100+ addresses
- ✅ Files up to 5MB
- ✅ Both CSV and Excel formats
- ✅ Multiple column configurations

For best results:
- Keep files under 2MB
- Limit to 200 addresses per file
- Use standard character encoding (UTF-8)

## Need Help?

See `ROUTE_ANALYZER_GUIDE.md` for complete documentation on using the Route Analyzer feature.
