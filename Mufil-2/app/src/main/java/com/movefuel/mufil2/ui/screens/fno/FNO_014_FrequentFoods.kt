package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO014FrequentFoodsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_014",
        title = "Frequent Foods",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_013,
        onNavigate = onNavigate,
    ) {
            MFNotice("No frequent confirmed foods", "Frequency is derived from canonical confirmed history; it is not seeded with sample meals.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO014FrequentFoodsScreenPreview() {
    MoveFuelTheme { FNO014FrequentFoodsScreen {} }
}
