# Test

Test scripts som sammenligner JSON respons fra webserveren og en statisk JSON respons downloadet fra Spiir.
Brugt til at få webserverens JSON responses til at ligne Spiirs så meget som muligt.

De statiske filer læses fra `../../archive/` (kan opdateres efter behov).

Hvis der ikke er noget behov for test, kan denne mappe slettes uden nogen konsekvenser.

Hvis tests skal køres, så kopier `.env.sample` til `.env` og udfyld miljøvariablene med korrekte værdier.