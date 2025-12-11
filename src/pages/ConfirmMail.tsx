import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmMail = () => {
  const handleReturn = () => {
    window.location.href = "https://juxai.lovable.app/";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center"
        >
          <CheckCircle className="w-20 h-20 text-green-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground">
          Adresse email confirmée !
        </h1>

        <p className="text-muted-foreground">
          Votre adresse email a bien été confirmée. Pour vous connecter à votre compte, 
          retournez sur la page de connexion et connectez-vous avec l'adresse email 
          et le mot de passe que vous avez utilisés lors de votre inscription.
        </p>

        <Button 
          onClick={handleReturn}
          className="w-full"
          size="lg"
        >
          Retourner sur Jux-AI
        </Button>
      </motion.div>
    </div>
  );
};

export default ConfirmMail;
