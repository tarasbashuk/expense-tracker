type ChartDims = {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    left: number;
    bottom: number;
  };
};

export const getYearlyChartDims = ({
  isExtraSmall,
  isSmall,
  isMedium,
}: Record<string, boolean>): ChartDims => {
  if (isExtraSmall) {
    return {
      width: 350,
      height: 420,
      margin: {
        top: 30,
        right: 20,
        left: 40,
        bottom: 120,
      },
    };
  }

  if (isSmall || isMedium) {
    return {
      width: 700,
      height: 520,
      margin: {
        top: 30,
        right: 50,
        left: 80,
        bottom: 90,
      },
    };
  }

  return {
    width: 900,
    height: 520,
    margin: {
      top: 30,
      right: 70,
      left: 70,
      bottom: 90,
    },
  };
};
