import csv, sys, os

# Find latest run
runs_dir = os.path.expanduser("~/Library/Application Support/merfox/MerFox/runs")
if not os.path.exists(runs_dir):
    print("Runs dir not found")
    sys.exit(1)

runs = sorted([os.path.join(runs_dir, d) for d in os.listdir(runs_dir) if os.path.isdir(os.path.join(runs_dir, d))], key=os.path.getmtime, reverse=True)
latest_run = runs[0]
print(f"Latest Run: {latest_run}")

p = os.path.join(latest_run, "amazon.tsv")
print(f"Checking {p}")

with open(p, "r", encoding="utf-8-sig", newline="") as f:
    r = csv.reader(f, delimiter="\t")
    header = next(r)

print("cols", len(header))
print(header)

expected = ["sku", "product_id", "product_id_type", "price", "quantity", "condition_type", "condition_note", "handling_time", "fulfillment_channel", "shipping_template_name"]
if header == expected:
    print("Header MATCH")
else:
    print("Header MISMATCH")
    print("Expected:", expected)
    sys.exit(1)
