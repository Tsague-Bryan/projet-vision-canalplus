export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground text-center py-6">
      <p>© 2026 Vision Canal+. Tous droits réservés.</p>
      <div className="space-x-4 mt-2">
        <a href="#" className="hover:text-primary-foreground/80">À propos</a>
        <a href="#" className="hover:text-primary-foreground/80">Contact</a>
        <a href="#" className="hover:text-primary-foreground/80">Confidentialité</a>
      </div>
    </footer>
  );
}