import toast from 'react-hot-toast';

export const notify = {
  success: (msg: string) => toast.success(msg, { duration: 5000 }),
  error: (msg: string) => toast.error(msg, { duration: 5000 }),
  info: (msg: string) => toast(msg, { duration: 5000 }),
};
