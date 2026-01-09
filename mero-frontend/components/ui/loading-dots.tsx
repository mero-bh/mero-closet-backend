"use client"

import { motion, Variants } from "motion/react"

export default function LoadingThreeDotsJumping() {
    const dotVariants: Variants = {
        jump: {
            transform: "translateY(-10px)",
            transition: {
                duration: 0.5,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
            },
        },
    }

    return (
        <motion.div
            animate="jump"
            transition={{ staggerChildren: 0.1 }}
            className="flex justify-center items-center gap-1 h-5"
        >
            <motion.div className="w-2 h-2 rounded-full bg-white" variants={dotVariants} />
            <motion.div className="w-2 h-2 rounded-full bg-white" variants={dotVariants} />
            <motion.div className="w-2 h-2 rounded-full bg-white" variants={dotVariants} />
        </motion.div>
    )
}
