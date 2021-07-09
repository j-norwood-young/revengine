const main = async () => {
    const Kafka = require("../kafka");
    const topic = "test";
    const consumer = new Kafka.KafkaConsumer({ topic, debug: true, group: "test" });
    const producer = new Kafka.KafkaProducer({ topic, debug: true });
    consumer.on("message", message => {
        console.log(`Yo! Recieved a message`);
        console.log(message);
    })
    setTimeout(() => {
        producer.send({ foo: "Foo", bar: "Bar" });
    }, 1000)
}

main();