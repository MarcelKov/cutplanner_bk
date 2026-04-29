# CutPlanner

Tento projekt je webová aplikace vytvořená v rámci Bakalářské práce v frameworku **Django**.

## Požadavky
* Python 3.x
* Pip 

## Instalace a spuštění

1. **Příprava virtuálního prostředí:**
   ```bash 
    python -m venv venv 
    source venv/bin/activate  # Pro Linux/macOS
   # nebo
    venv\Scripts\activate    # Pro Windows
    ```
2. **Instalace závislostí:**
    ```bash
    pip install -r requirements.txt 
    ```

3. **Konfigurace prostředí:**
    Zkopírujte soubor .env.example a přejmenujte jej na .env
    V souboru vyplňte potřebné údaje.

4. **Databázové migrace:**
    ```bash
    python manage.py migrate 
    ```

5. **Spuštění serveru:**
    ```bash
    python manage.py runserver  
    ```

## Autor
Marcel Kováč
Github: [https://github.com/MarcelKov/cutplanner_bk]