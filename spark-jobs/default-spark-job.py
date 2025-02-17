from pyspark.sql import SparkSession

def main():
    spark = SparkSession.builder.appName("DefaultSparkJob").getOrCreate()
    # A trivial DataFrame
    data = [(1, "foo"), (2, "bar")]
    df = spark.createDataFrame(data, ["id", "value"])
    df.show()
    spark.stop()

if __name__ == "__main__":
    main()