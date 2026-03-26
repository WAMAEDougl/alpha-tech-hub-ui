import { motion } from "framer-motion";
import { Shield, Award, Users, Clock } from "lucide-react";
import logoRed from "@/assets/logo-red.png";

const stats = [
  { icon: Clock, label: "Years in Business", value: "9+" },
  { icon: Users, label: "Happy Customers", value: "5,000+" },
  { icon: Award, label: "Repairs Completed", value: "12,000+" },
  { icon: Shield, label: "Warranty on Repairs", value: "90 Days" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              About <span className="text-primary">Alpha Computers</span>
            </h2>
            <p className="text-muted-foreground mb-4">
              Founded in 2015, Alpha Computers Nanyuki has grown to become the most trusted technology
              hub in Laikipia County. We are passionate about connecting people with the right technology
              and keeping their devices running at peak performance.
            </p>
            <p className="text-muted-foreground mb-6">
              From students buying their first laptop to businesses setting up entire networks, we serve
              every customer with the same dedication — honest advice, fair prices, and expert service.
              Our certified technicians handle everything from screen replacements to complex data recovery.
            </p>
            <ul className="space-y-2 text-sm">
              {[
                "Authorised reseller of HP, Dell, Lenovo, ASUS and more",
                "Certified technicians with 5+ years experience",
                "Genuine spare parts and accessories",
                "Free diagnostics on all walk-in repairs",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Logo + Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col items-center gap-8"
          >
            <img src={logoRed} alt="Alpha Computers" className="h-24 w-auto" />
            <div className="grid grid-cols-2 gap-4 w-full">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border rounded-xl p-5 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow"
                >
                  <stat.icon className="h-6 w-6 text-primary" />
                  <p className="text-2xl font-heading font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
