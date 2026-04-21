FROM python:3.12-slim

# NOTE: Build context must be the repo root (not backend/).
# docker-compose sets context: . so the Excel data file can be included.
# All COPY paths below are relative to the repo root.

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/
COPY GB921_Business_Process_Framework_Processes_Excel_v25.5.xlsx /app/data_source/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
