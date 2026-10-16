## One layer beneath the program

Once a program starts, who decides when it runs again? What separates the memory it sees from the memory actually allocated?

I've been exploring these questions through xv6 system-call and scheduling labs, and memory-allocator exercises. This is a learning trail, not a complete operating system of my own.

### Where a block of memory goes

An allocator starts with finding enough free space. Then come questions about block layout, coalescing after a free, and using multiple free lists to organize the search.

I also ask where a benchmark number comes from: which workload, which baseline, and what throughput and space utilization each tell us. A number belongs with its measurement conditions.

### When several things happen at once

System calls, scheduling, and concurrency move the focus beyond one sequential piece of code toward how execution shares resources. I want to trace a state change through the code, as well as learn the vocabulary.

There's a related experiment in `/agent-notes`: when an agent takes action, who maintains the execution boundaries?
