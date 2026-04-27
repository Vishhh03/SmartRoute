import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, GitBranch, Target, Sparkles } from "lucide-react";

const steps = [
  { icon: Target, title: "Data Collection", desc: "Hourly traffic data with weather and environmental features collected from highway sensors." },
  { icon: GitBranch, title: "Feature Engineering", desc: "Preprocessing including encoding categorical variables, scaling numerical features, and handling missing values." },
  { icon: Brain, title: "Model Training", desc: "Machine learning models (Random Forest, Gradient Boosting) trained on the processed dataset to learn traffic patterns." },
  { icon: Sparkles, title: "Prediction API", desc: "Trained model served via FastAPI endpoint for real-time traffic volume predictions." },
];

const About = () => (
  <div className="space-y-6 max-w-3xl">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display text-3xl font-bold">About the Project</h1>
      <p className="mt-1 text-muted-foreground">Understanding the Traffic Volume Prediction System.</p>
    </motion.div>

    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Project Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          The <strong>Smart Traffic Volume Prediction System</strong> leverages machine learning to
          forecast traffic volume based on real-time weather and environmental conditions. This helps
          urban planners, commuters, and logistics companies make data-driven decisions.
        </p>
        <p>
          By analyzing historical patterns between weather conditions and traffic flow, the system
          provides accurate hourly predictions that can be used for route planning, infrastructure
          management, and traffic control optimization.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Model Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Technology Stack</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-semibold text-secondary-foreground">Frontend</p>
            <p className="text-xs text-muted-foreground">React + Vite + Tailwind CSS</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-semibold text-secondary-foreground">Backend</p>
            <p className="text-xs text-muted-foreground">FastAPI + Python</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-semibold text-secondary-foreground">ML Model</p>
            <p className="text-xs text-muted-foreground">Scikit-learn / XGBoost</p>
          </div>
          <div className="rounded-lg bg-secondary p-3">
            <p className="font-semibold text-secondary-foreground">Visualization</p>
            <p className="text-xs text-muted-foreground">Recharts</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default About;
