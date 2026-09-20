package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR016CustomProductScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_016",
        title = "Custom Product",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_015,
        onNavigate = onNavigate,
    ) {
            MFField("Product name", "Custom product")
            MFField("Serving size", "—")
            MFField("Energy", "—")
            MFField("Protein", "—")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR016CustomProductScreenPreview() {
    MoveFuelTheme { BAR016CustomProductScreen {} }
}
