import { useToastContext } from '../components/ToastProvider';

export const useToast = () => {
  const { addToast } = useToastContext();
  return { addToast };
};

export default useToast;
