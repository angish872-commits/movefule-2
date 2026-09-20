package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO007EditMealScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_007",
        title = "Edit Meal",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_006,
        onNavigate = onNavigate,
    ) {
            MFField("Meal name", "Lunch")
            MFField("Time", "13:16")
            MFListItem("Chicken rice bowl","Confirmed food","Edit")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO007EditMealScreenPreview() {
    MoveFuelTheme { FNO007EditMealScreen {} }
}
