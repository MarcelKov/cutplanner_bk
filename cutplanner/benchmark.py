import sys
import os
import time
import statistics
from types import SimpleNamespace

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from services import NestingEngine

def measure_execution(p_count, s_count, priority):
    mock_settings = SimpleNamespace(
        bladeThickness=4.0,
        trim=SimpleNamespace(top=10, bottom=10, left=10, right=10),
        optimizationPriority=priority
    )
    
    mock_data = SimpleNamespace(
        settings=mock_settings,
        panels=[SimpleNamespace(
            label="Panel", length=500, width=300, quantity=p_count, 
            material=1, edge_top=None, edge_bottom=None, edge_left=None, edge_right=None
        )],
        stockSheets=[SimpleNamespace(
            label="Deska", length=2800, width=2070, quantity=s_count, material=1
        )]
    )

    context = {
        "materials": {1: {"thickness": 18, "grain": "none", "price": 100}},
        "edgebands": {}
    }

    engine = NestingEngine(mock_data, context)
    
    runs = []
    for _ in range(3):
        start_time = time.perf_counter()
        engine.execute()
        end_time = time.perf_counter()
        runs.append((end_time - start_time) * 1000)
    
    return statistics.mean(runs)

def run_performance_test():
    panel_counts = [10, 50, 100, 200]
    stock_counts = [1, 5, 10]
    priorities = ["waste", "cuts", "stock", "lib"]

    print(f"{'Priorita':<10} | {'Dílce':<6} | {'Desky':<6} | {'Čas [ms]':<15}")
    print("-" * 50)

    for priority in priorities:
        for s_count in stock_counts:
            for p_count in panel_counts:
                avg_time = measure_execution(p_count, s_count, priority)
                print(f"{priority:<10} | {p_count:<6} | {s_count:<6} | {avg_time:<15.2f}")
        print("-" * 50)

if __name__ == "__main__":
    run_performance_test()