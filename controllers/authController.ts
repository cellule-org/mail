import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Logique d'authentification
        if (email && password) {
            // Dans un cas réel, vérifiez les identifiants dans la base de données
            const user = { id: 1, email };

            // Générer un token JWT
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.status(200).json({ token });
        } else {
            res.status(400).json({ message: 'Email et mot de passe requis' });
        }
    } catch (error) {
        next(error);
    }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Logique d'inscription
        if (email && password) {
            // Dans un cas réel, créez un nouvel utilisateur dans la base de données
            res.status(201).json({ message: 'Utilisateur créé avec succès' });
        } else {
            res.status(400).json({ message: 'Email et mot de passe requis' });
        }
    } catch (error) {
        next(error);
    }
};
