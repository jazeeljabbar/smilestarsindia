import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth.tsx';
import { useToast } from '@/hooks/use-toast';

interface FranchiseAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FranchiseAgreementModal({ isOpen, onClose }: FranchiseAgreementModalProps) {
  const [hasReadAgreement, setHasReadAgreement] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptAgreementMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/accept-agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          agreementIds: [1] // Franchise agreement ID
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept agreement');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/franchises'] });
      toast({
        title: 'Agreement Accepted',
        description: 'Welcome to Smile Stars India! You can now access all franchise features.',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept agreement',
        variant: 'destructive',
      });
    },
  });

  const handleAccept = () => {
    if (!hasReadAgreement || !isAccepted) {
      toast({
        title: 'Please confirm',
        description: 'You must read the agreement and check both boxes to proceed.',
        variant: 'destructive',
      });
      return;
    }
    acceptAgreementMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Smile Stars India Franchise Agreement
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <h3 className="text-lg font-semibold">1. Franchise Grant</h3>
            <p>
              Smile Stars India hereby grants you the right to operate a dental care franchise
              in your designated territory. This includes the right to use our trademark,
              brand name, and proven business systems.
            </p>

            <h3 className="text-lg font-semibold">2. Territory Rights</h3>
            <p>
              You will have exclusive rights to operate within your designated region.
              No other Smile Stars India franchise will be granted within your territory
              during the term of this agreement.
            </p>

            <h3 className="text-lg font-semibold">3. Responsibilities</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintain high standards of dental care and customer service</li>
              <li>Follow all Smile Stars India operational procedures</li>
              <li>Complete required training programs</li>
              <li>Submit monthly reports and financial statements</li>
              <li>Comply with all local health and safety regulations</li>
            </ul>

            <h3 className="text-lg font-semibold">4. Support Provided</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Initial training and ongoing support</li>
              <li>Marketing materials and brand guidelines</li>
              <li>Technology platform and software systems</li>
              <li>Quality assurance and operational guidance</li>
              <li>Regular franchise meetings and updates</li>
            </ul>

            <h3 className="text-lg font-semibold">5. Financial Terms</h3>
            <p>
              Franchise fees, royalty payments, and marketing contributions will be
              as outlined in the financial disclosure document provided separately.
              All payments must be made according to the agreed schedule.
            </p>

            <h3 className="text-lg font-semibold">6. Term and Renewal</h3>
            <p>
              This agreement is valid for 5 years from the date of acceptance,
              with options for renewal subject to performance and compliance
              with franchise standards.
            </p>

            <h3 className="text-lg font-semibold">7. Termination</h3>
            <p>
              Either party may terminate this agreement with 90 days written notice.
              Immediate termination may occur in cases of breach of contract,
              non-payment, or failure to maintain standards.
            </p>

            <h3 className="text-lg font-semibold">8. Governing Law</h3>
            <p>
              This agreement shall be governed by the laws of India and any disputes
              will be resolved through arbitration in accordance with Indian
              Arbitration and Conciliation Act.
            </p>
          </div>
        </ScrollArea>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="read-agreement" 
              checked={hasReadAgreement}
              onCheckedChange={(checked) => setHasReadAgreement(checked === true)}
            />
            <label 
              htmlFor="read-agreement" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and understood the franchise agreement
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="accept-agreement" 
              checked={isAccepted}
              onCheckedChange={(checked) => setIsAccepted(checked === true)}
            />
            <label 
              htmlFor="accept-agreement" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the terms and conditions of this franchise agreement
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              disabled={acceptAgreementMutation.isPending}
              onClick={() => {
                toast({
                  title: 'Agreement Required',
                  description: 'You must accept the franchise agreement to continue using the system.',
                  variant: 'destructive',
                });
              }}
            >
              I need more time
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={!hasReadAgreement || !isAccepted || acceptAgreementMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {acceptAgreementMutation.isPending ? 'Processing...' : 'Accept & Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}