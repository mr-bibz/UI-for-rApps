# jobs/train_model.py
import sys
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--modelName', type=str, default='myModel')
    parser.add_argument('--version', type=str, default='v0.1')
    args = parser.parse_args()

    # Simulate training
    print(f"Training model {args.modelName}, version {args.version}")
    # Here you'd load data from NiFi/MongoDB, transform, train Spark ML, etc.
    # This is just a placeholder print statement.

if __name__ == '__main__':
    main()
