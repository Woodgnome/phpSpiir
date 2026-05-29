# phpSpiir

Klon af PHP med scrapet frontend* og reverse engineered backend i PHP.

\* *Plus ændringer af en håndfuld stier i `(old)config.js`*

## Disclaimer

Dette projekt er 99% lavet til eget brug og kvaliteten er derefter, f.eks.:

- Ingen brugerhåndtering.
- Ingen optimering af databasen ved stort antal post.
- Begrænset strukturering og kommentering af koden.
- Ingen test/reverse engineering af funktionalitet, som jeg ikke selv har gjort brug af.

## Opsætning

1. Installer en LAMP stack eller tilsvarende.
    - Webserveren skal understøtte `.htaccess` (alternativt skal der laves redirects/rewrites, så de korrekte filer åbnes).
2. Opret en database og importer databasetabeller fra `./db/schema.sql`.
3. Kopier `.env.sample` til `.env` og udfyld de definerede miljøvariable.
    - Bruger-ID kan trækkes ud fra https://mine.spiir.dk/ kildekoden (der er et stykke Javascript ala `define('session', [], {......,"userId":12345678,.....})`).
    - Alt på nær databaseindstillingerne *burde* være ligegyldige (men ikke noget jeg har testet).
4. Download følgende filer fra Spiir (via web inspector eller lignende) og placer under `./archive/`:
    - "Konti" => `https://mine.spiir.dk/Account/GetBanks` => `./archive/banks.json`
    - "Konti" => `https://mine.spiir.dk/Account/GetAccountGroups` => `./archive/accounts.json`
    - "Eksporter data" => "Eksporter til JSON" => `./archive/alle-poster-****-**.**.json`
5. Installer Composer til PHP og kør følgende kommando i roden af projektet for at downloade Composer pakker:
    - `composer install`
6. Kør følgende PHP scripts (i roden af projektet - virker måske også fra andre paths, men ikke testet):
    1. `php import/banks.php`
    2. `php import/countries.php`
    3. `php import/categories.php`
    4. `php import/subcategories.php`
    5. `php import/accounts.php`
    6. `php import/posts.php`
